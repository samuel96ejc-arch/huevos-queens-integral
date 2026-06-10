// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  PlusCircle, 
  Trash2, 
  DollarSign, 
  ClipboardList, 
  Truck, 
  CheckCircle, 
  Calculator,
  Wallet,
  Users,
  Calendar,
  Search,
  Wifi,
  WifiOff,
  Cloud,
  Save,
  Receipt,
  Plus,
  TrendingUp,
  TrendingDown,
  ArrowDownCircle,
  ArrowUpCircle,
  Leaf,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  List,
  Filter,
  PieChart as PieChartIcon,
  ArrowRight,
  Sparkles,
  Award,
  BarChart2,
  CheckSquare,
  Heart
} from 'lucide-react';
import { 
  PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';

import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, collection, onSnapshot, addDoc, deleteDoc } from "firebase/firestore";

if (typeof window !== 'undefined' && !window.ResizeObserver) {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = ResizeObserverMock;
}

const firebaseConfig = {
  apiKey: "AIzaSyDiWfZPVVDQqH4WB0ec1lfOU4w3BZ6Xrl0",
  authDomain: "huevos-queens.firebaseapp.com",
  projectId: "huevos-queens",
  storageBucket: "huevos-queens.firebasestorage.app",
  messagingSenderId: "131121347509",
  appId: "1:131121347509:web:115811e07073d2c7ccf7fc",
  measurementId: "G-NHR66VFBZQ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'huevos-queens-v4-clean';

const COLORS = ['#0f766e', '#d97706', '#2563eb', '#dc2626', '#7c3aed', '#db2777', '#4b5563'];
const TIPOS_HUEVO = ['Jumbo', 'AAA', 'AA', 'A', 'B', 'C', 'Rotos'];

// VALORES BASE HISTÓRICOS FIJADOS
const INVERSION_BASE = 236000000;
const RETORNO_BASE = 82700000;

const DIA_VACIO = {
  fincaProduccion: { 'Jumbo': 0, 'AAA': 0, 'AA': 0, 'A': 0, 'B': 0, 'C': 0, 'Rotos': 0 },
  fincaVentas: [], 
  fincaTransfers: { 'Jumbo': 0, 'AAA': 0, 'AA': 0, 'A': 0, 'B': 0, 'C': 0, 'Rotos': 0 }, 
  invInicial: { 'Jumbo': 0, 'AAA': 0, 'AA': 0, 'A': 0, 'B': 0, 'C': 0, 'Rotos': 0 },
  ventas: [], 
  cobros: [], 
  gastos: [], 
  invFinalFisico: { 'Jumbo': '', 'AAA': '', 'AA': '', 'A': '', 'B': '', 'C': '', 'Rotos': '' }
};

export default function App() {
  const [user, setUser] = useState(null);
  const [dbData, setDbData] = useState({}); 
  const [transactions, setTransactions] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [vista, setVista] = useState('dashboard'); 
  const [online, setOnline] = useState(navigator.onLine);
  const [mostrarAyudaAuth, setMostrarAyudaAuth] = useState(false);
  
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'success', onConfirm: null });
  const [toastMessage, setToastMessage] = useState('');

  const [nuevaVentaDist, setNuevaVentaDist] = useState({ cliente: '', cantidad: '', tipo: 'A', precioUnitario: '', pagadoAElla: true, metodoPago: 'Efectivo' });
  const [nuevaVentaFinca, setNuevaVentaFinca] = useState({ cliente: '', cantidad: '', tipo: 'A', precioUnitario: '', metodoPago: 'Efectivo' });
  const [nuevoGastoDist, setNuevoGastoDist] = useState({ concepto: '', valor: '' });
  
  const [nuevoMovimientoFinanciero, setNuevoMovimientoFinanciero] = useState({
    tipo: 'Gasto de la Granja', concepto: '', valor: '', categoria: 'Insumos', fuenteFinanciamiento: 'Ventas Propias (Suma a Retorno)', empleadoNombre: 'Samuel', ayudanteNombre: ''
  });

  const [busquedaDeudor, setBusquedaDeudor] = useState('');
  const [montoAbono, setMontoAbono] = useState('');
  const [deudorSeleccionado, setDeudorSeleccionado] = useState(null);
  const [metodoPagoAbono, setMetodoPagoAbono] = useState('Efectivo');

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Error Auth, reintentando anónimo:", err);
        try {
          await signInAnonymously(auth);
        } catch (err2) {
          console.error("Fallo total de autenticación:", err2);
          setMostrarAyudaAuth(true);
          showToast('⚠️ Usando almacenamiento local por fallas de conexión.');
          setLoading(false);
        }
      }
    };

    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) setMostrarAyudaAuth(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) {
      if (!db) setLoading(false);
      return;
    }

    const dailyRecordsRef = collection(db, 'artifacts', appId, 'public', 'data', 'daily_records');
    const unsubscribeDaily = onSnapshot(dailyRecordsRef, (snapshot) => {
      const records = {};
      snapshot.forEach(doc => { records[doc.id] = doc.data(); });
      setDbData(records);
    }, (error) => {
      console.error("Error BD Registros Diarios:", error);
      setLoading(false);
    });

    const transactionsRef = collection(db, 'artifacts', appId, 'public', 'data', 'transactions');
    const unsubscribeTrans = onSnapshot(transactionsRef, (snapshot) => {
      const transList = [];
      snapshot.forEach(doc => { transList.push({ id: doc.id, ...doc.data() }); });
      transList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(transList);
      setLoading(false);
    }, (error) => {
      console.error("Error BD Transacciones:", error);
      setLoading(false);
    });

    return () => {
      unsubscribeDaily();
      unsubscribeTrans();
    };
  }, [user]);

  useEffect(() => {
    const handleStatus = () => setOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    const datosHoy = dbData[fecha];
    const esDiaNuevo = !datosHoy || (datosHoy.invInicial && Object.values(datosHoy.invInicial).every(v => v === 0));

    if (esDiaNuevo) {
      const hoy = new Date(fecha + 'T12:00:00');
      const ayerObj = new Date(hoy);
      ayerObj.setDate(hoy.getDate() - 1);
      const ayer = ayerObj.toISOString().split('T')[0];
      const datosAyer = dbData[ayer];

      if (datosAyer && datosAyer.invFinalFisico) {
        const inventarioHeredado = {};
        let hayDatos = false;
        
        TIPOS_HUEVO.forEach(tipo => {
          const valorAyer = Number(datosAyer.invFinalFisico[tipo] || 0);
          inventarioHeredado[tipo] = valorAyer;
          if (valorAyer > 0) hayDatos = true;
        });

        if (hayDatos) {
          guardarEnFirebase({ 
            ...(datosHoy || DIA_VACIO), 
            invInicial: inventarioHeredado 
          }, fecha, false);
        }
      }
    }
  }, [fecha, dbData, loading]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const showAlert = (title, message, type = 'success', onConfirm = null) => {
    setAlertConfig({ visible: true, title, message, type, onConfirm });
  };

  const closeAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const asegurarAutenticacion = async () => {
    if (!auth.currentUser) {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        console.error("Intento de reconexión fallido:", e);
      }
    }
  };

  const guardarEnFirebase = async (datosActualizados, fechaDestino = fecha, mostrarMensaje = true) => {
    await asegurarAutenticacion();
    if (!auth.currentUser) {
      setMostrarAyudaAuth(true);
      showToast('❌ Error: Base de datos desconectada.');
      return;
    }
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'daily_records', fechaDestino);
      await setDoc(docRef, datosActualizados, { merge: true });
      if (mostrarMensaje) showToast('💾 Guardado en la Nube');
    } catch (e) {
      console.error("Error al guardar en Firebase:", e);
      showToast('❌ Error al guardar datos');
    }
  };

  const datosDia = dbData[fecha] || DIA_VACIO;

  const totalProduccionHoy = TIPOS_HUEVO.reduce((acc, tipo) => acc + Number(datosDia.fincaProduccion?.[tipo] || 0), 0);
  const totalStockInicial = TIPOS_HUEVO.reduce((acc, tipo) => acc + Number(datosDia.invInicial?.[tipo] || 0), 0);

  const handleFincaProduccionChange = (tipo, valor) => {
    const fincaProduccion = { ...datosDia.fincaProduccion || DIA_VACIO.fincaProduccion, [tipo]: Number(valor) };
    guardarEnFirebase({ ...datosDia, fincaProduccion });
  };

  const handleFincaTransferChange = (tipo, valor) => {
    const canTrans = Number(valor);
    const fincaTransfers = { ...datosDia.fincaTransfers || DIA_VACIO.fincaTransfers, [tipo]: canTrans };
    guardarEnFirebase({ ...datosDia, fincaTransfers });
  };

  const agregarVentaFinca = () => {
    if (!nuevaVentaFinca.cliente || !nuevaVentaFinca.cantidad || !nuevaVentaFinca.precioUnitario) {
      showToast('⚠️ Completa todos los campos de venta.');
      return;
    }
    const totalVenta = Number(nuevaVentaFinca.cantidad) * Number(nuevaVentaFinca.precioUnitario);
    const venta = {
      id: Date.now(),
      fechaRegistro: fecha,
      ...nuevaVentaFinca,
      cantidad: Number(nuevaVentaFinca.cantidad),
      precioUnitario: Number(nuevaVentaFinca.precioUnitario),
      total: totalVenta,
      liquidado: false, // Control de acumulado Finca
      diezmoLiquidado: false // Control de acumulado Socio Dios
    };

    const fincaVentas = [...datosDia.fincaVentas || [], venta];
    guardarEnFirebase({ ...datosDia, fincaVentas });

    setNuevaVentaFinca({ cliente: '', cantidad: '', tipo: 'A', precioUnitario: '', metodoPago: 'Efectivo' });
    showToast('🥚 Venta de Finca registrada.');
  };

  const borrarVentaFinca = (id) => {
    showAlert("Confirmar Eliminación", "¿Seguro que deseas borrar esta venta de Finca?", "danger", () => {
      const fincaVentas = (datosDia.fincaVentas || []).filter(v => v.id !== id);
      guardarEnFirebase({ ...datosDia, fincaVentas });
      closeAlert();
      showToast('🗑️ Venta eliminada de inventario');
    });
  };

  // ACUMULADO FINCA DÍA TRAS DÍA
  const acumuladoFincaPendiente = useMemo(() => {
    let totalCartones = 0;
    let totalDinero = 0;
    let ventasPendientes = [];

    Object.keys(dbData).forEach(date => {
      const ventas = dbData[date].fincaVentas || [];
      ventas.forEach(v => {
        if (!v.liquidado) {
          totalCartones += Number(v.cantidad || 0);
          totalDinero += Number(v.total || 0);
          ventasPendientes.push({ date, ...v });
        }
      });
    });
    return { totalCartones, totalDinero, ventasPendientes };
  }, [dbData]);

  const liquidarVentasFinca = async () => {
    if (acumuladoFincaPendiente.ventasPendientes.length === 0) return;
    
    showAlert("Liquidar Acumulado", `¿Marcar ventas (${acumuladoFincaPendiente.totalCartones} cartones por $${acumuladoFincaPendiente.totalDinero.toLocaleString()}) como PAGADAS y reiniciar a cero?`, "success", async () => {
      const updatesByDate = {};
      acumuladoFincaPendiente.ventasPendientes.forEach(v => {
        if (!updatesByDate[v.date]) updatesByDate[v.date] = [...dbData[v.date].fincaVentas];
        const idx = updatesByDate[v.date].findIndex(x => x.id === v.id);
        if (idx !== -1) updatesByDate[v.date][idx].liquidado = true;
      });

      const promises = Object.keys(updatesByDate).map(date => {
        return guardarEnFirebase({ ...dbData[date], fincaVentas: updatesByDate[date] }, date, false);
      });
      
      await Promise.all(promises);
      closeAlert();
      showToast('✅ Acumulado de Finca liquidado a cero.');
    });
  };

  // ACUMULADO SOCIO DIOS (10%)
  const acumuladoDiezmo = useMemo(() => {
    let totalVentas = 0;
    let ventasPendientesFinca = [];
    let ventasPendientesDist = [];

    Object.keys(dbData).forEach(date => {
      const dia = dbData[date];
      (dia.fincaVentas || []).forEach(v => {
        if (v.diezmoLiquidado !== true) {
          totalVentas += Number(v.total || 0);
          ventasPendientesFinca.push({ date, id: v.id });
        }
      });
      (dia.ventas || []).forEach(v => {
        if (v.diezmoLiquidado !== true) {
          totalVentas += Number(v.total || 0);
          ventasPendientesDist.push({ date, id: v.id });
        }
      });
    });

    return {
      totalVentas,
      diezmoTotal: totalVentas * 0.10,
      ventasPendientesFinca,
      ventasPendientesDist
    };
  }, [dbData]);

  const liquidarDiezmo = async () => {
    if (acumuladoDiezmo.totalVentas === 0) return;
    
    showAlert("Liquidar Aporte a Socio Dios", `¿Registrar diezmo del 10% ($${acumuladoDiezmo.diezmoTotal.toLocaleString()}) y reiniciar el acumulado de ventas a cero?`, "success", async () => {
      const updatesByDate = {};
      
      acumuladoDiezmo.ventasPendientesFinca.forEach(v => {
        if (!updatesByDate[v.date]) updatesByDate[v.date] = { ...dbData[v.date] };
        if (!updatesByDate[v.date].fincaVentas) updatesByDate[v.date].fincaVentas = [...(dbData[v.date].fincaVentas || [])];
        const idx = updatesByDate[v.date].fincaVentas.findIndex(x => x.id === v.id);
        if (idx !== -1) updatesByDate[v.date].fincaVentas[idx].diezmoLiquidado = true;
      });

      acumuladoDiezmo.ventasPendientesDist.forEach(v => {
        if (!updatesByDate[v.date]) updatesByDate[v.date] = { ...dbData[v.date] };
        if (!updatesByDate[v.date].ventas) updatesByDate[v.date].ventas = [...(dbData[v.date].ventas || [])];
        const idx = updatesByDate[v.date].ventas.findIndex(x => x.id === v.id);
        if (idx !== -1) updatesByDate[v.date].ventas[idx].diezmoLiquidado = true;
      });

      const promises = Object.keys(updatesByDate).map(date => {
        return guardarEnFirebase(updatesByDate[date], date, false);
      });
      
      await Promise.all(promises);
      closeAlert();
      showToast('🕊️ Aporte a Socio Principal liquidado y reiniciado a cero.');
    });
  };

  const handleInvInicialChange = (tipo, valor) => {
    guardarEnFirebase({ ...datosDia, invInicial: { ...datosDia.invInicial, [tipo]: Number(valor) } });
  };

  const handleInvFinalChange = (tipo, valor) => {
    guardarEnFirebase({ ...datosDia, invFinalFisico: { ...datosDia.invFinalFisico, [tipo]: valor } });
  };

  const agregarVentaDist = () => {
    if (!nuevaVentaDist.cliente || !nuevaVentaDist.cantidad || !nuevaVentaDist.precioUnitario) {
      showToast('⚠️ Completa la venta de Distribuidora.');
      return;
    }
    const venta = {
      id: Date.now(), 
      fechaRegistro: fecha, 
      ...nuevaVentaDist,
      cantidad: Number(nuevaVentaDist.cantidad), 
      precioUnitario: Number(nuevaVentaDist.precioUnitario),
      total: Number(nuevaVentaDist.cantidad) * Number(nuevaVentaDist.precioUnitario),
      abonado: nuevaVentaDist.pagadoAElla ? (Number(nuevaVentaDist.cantidad) * Number(nuevaVentaDist.precioUnitario)) : 0,
      diezmoLiquidado: false // Control de acumulado Socio Dios
    };
    guardarEnFirebase({ ...datosDia, ventas: [...datosDia.ventas || [], venta] });

    setNuevaVentaDist({ ...nuevaVentaDist, cliente: '', cantidad: '', precioUnitario: '' });
    showToast('📦 Venta de distribuidora añadida.');
  };

  const borrarVentaDist = (id) => {
    showAlert("¿Borrar venta?", "¿Quieres eliminar este registro de venta?", "danger", () => {
      guardarEnFirebase({ ...datosDia, ventas: (datosDia.ventas || []).filter(v => v.id !== id) });
      closeAlert();
      showToast('🗑️ Venta eliminada.');
    });
  };

  const agregarGastoDist = () => {
    if (!nuevoGastoDist.concepto || !nuevoGastoDist.valor) return;
    const gasto = { 
      id: Date.now(), 
      concepto: nuevoGastoDist.concepto, 
      valor: Number(nuevoGastoDist.valor) 
    };
    
    guardarEnFirebase({ ...datosDia, gastos: [...datosDia.gastos || [], gasto] });
    setNuevoGastoDist({ concepto: '', valor: '' });
    showToast('💸 Gasto operativo de distribuidora guardado.');
  };

  const borrarGastoDist = (id) => {
    showAlert("¿Eliminar Gasto?", "¿Quieres quitar este gasto diario?", "danger", () => {
      guardarEnFirebase({ ...datosDia, gastos: (datosDia.gastos || []).filter(g => g.id !== id) });
      closeAlert();
      showToast('🗑️ Gasto diario eliminado.');
    });
  };

  const realizarCobroDeuda = async () => {
    if (!deudorSeleccionado || !montoAbono) return;
    const valorAbono = Number(montoAbono);
    const fechaOriginal = deudorSeleccionado.fechaOriginal;
    const nuevoCobro = {
      id: Date.now(), 
      cliente: deudorSeleccionado.cliente, 
      valor: valorAbono,
      metodoPago: metodoPagoAbono, 
      refVentaId: deudorSeleccionado.id, 
      nota: `Abono de deuda del día ${fechaOriginal}`
    };
    const diaOriginal = dbData[fechaOriginal];
    const ventasActualizadas = diaOriginal.ventas.map(v => v.id === deudorSeleccionado.id ? { ...v, abonado: v.abonado + valorAbono } : v);
    
    await Promise.all([
      guardarEnFirebase({ ...datosDia, cobros: [...datosDia.cobros || [], nuevoCobro] }, fecha),
      guardarEnFirebase({ ...diaOriginal, ventas: ventasActualizadas }, fechaOriginal)
    ]);
    
    setMontoAbono(''); 
    setDeudorSeleccionado(null); 
    setMetodoPagoAbono('Efectivo');
    showToast('💰 Abono a deudor registrado.');
  };

  const borrarCobroHoy = (cobro) => {
    showAlert("¿Borrar cobro?", "Se revertirá el abono en la deuda del cliente.", "danger", async () => {
      let fOriginal = null;
      Object.keys(dbData).forEach(fechaKey => {
        const dia = dbData[fechaKey];
        if (dia.ventas) {
          const ventaIndex = dia.ventas.findIndex(v => v.id === cobro.refVentaId);
          if (ventaIndex !== -1) fOriginal = fechaKey;
        }
      });

      if (fOriginal) {
        const diaOriginal = dbData[fOriginal];
        const ventasRevertidas = diaOriginal.ventas.map(v => v.id === cobro.refVentaId ? { ...v, abonado: Math.max(0, v.abonado - cobro.valor) } : v);
        await guardarEnFirebase({ ...diaOriginal, ventas: ventasRevertidas }, fOriginal, false);
      }

      await guardarEnFirebase({ ...datosDia, cobros: (datosDia.cobros || []).filter(c => c.id !== cobro.id) }, fecha);
      closeAlert();
      showToast('🗑️ Abono revertido.');
    });
  };

  const guardarMovimientoFinanciero = async (e) => {
    e.preventDefault();
    await asegurarAutenticacion();
    if (!auth.currentUser) {
      setMostrarAyudaAuth(true);
      return;
    }

    if (!nuevoMovimientoFinanciero.concepto || !nuevoMovimientoFinanciero.valor) {
      showToast('⚠️ Inserta concepto y monto.');
      return;
    }

    try {
      const isNomina = nuevoMovimientoFinanciero.tipo === 'Pago de Nómina';
      
      let descFinal = nuevoMovimientoFinanciero.concepto;
      let catFinal = nuevoMovimientoFinanciero.categoria;

      if (isNomina) {
        catFinal = 'Nómina';
        const emp = nuevoMovimientoFinanciero.empleadoNombre;
        const nombreTrabajador = emp === 'Ayudante Extra' ? nuevoMovimientoFinanciero.ayudanteNombre : emp;
        descFinal = `Nómina: Pago a ${nombreTrabajador} - (${nuevoMovimientoFinanciero.concepto})`;
      } else if (nuevoMovimientoFinanciero.tipo === 'Otros Gastos') {
        catFinal = 'Otros';
      }

      const payload = {
        type: 'gasto_operativo', 
        date: fecha,
        amount: Number(nuevoMovimientoFinanciero.valor),
        description: descFinal,
        category: catFinal,
        fuenteFinanciamiento: nuevoMovimientoFinanciero.fuenteFinanciamiento,
        createdAt: new Date()
      };

      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'transactions'), payload);
      
      setNuevoMovimientoFinanciero({
        tipo: 'Gasto de la Granja', concepto: '', valor: '', categoria: 'Insumos', fuenteFinanciamiento: 'Ventas Propias (Suma a Retorno)', empleadoNombre: 'Samuel', ayudanteNombre: ''
      });

      showToast('💳 Transacción Guardada Exitosamente.');
    } catch (err) {
      console.error("Error guardando flujo financiero:", err);
      showToast('❌ Error al guardar transacción');
    }
  };

  const borrarMovimientoFinanciero = (id) => {
    showAlert("¿Eliminar transacción?", "Se borrará permanentemente de la contabilidad.", "danger", async () => {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'transactions', id));
        closeAlert();
        showToast('🗑️ Transacción borrada.');
      } catch (e) {
        console.error(e);
        showToast('❌ Error al borrar');
      }
    });
  };

  const listaDeudores = useMemo(() => {
    let deudores = [];
    Object.keys(dbData).forEach(fechaKey => {
      const dia = dbData[fechaKey];
      if (dia.ventas) {
        dia.ventas.forEach(venta => {
          if ((venta.abonado || 0) < (venta.total || 0)) {
            deudores.push({ 
              ...venta, 
              fechaOriginal: fechaKey, 
              saldoPendiente: Number(venta.total || 0) - Number(venta.abonado || 0) 
            });
          }
        });
      }
    });
    return deudores.sort((a, b) => new Date(b.fechaOriginal).getTime() - new Date(a.fechaOriginal).getTime());
  }, [dbData]);

  // CÁLCULO DE BALANCE PUNTO CERO (BASES HISTÓRICAS FIJAS)
  const balancePuntoCero = useMemo(() => {
    let totalInyectado = INVERSION_BASE;
    let totalDevuelto = RETORNO_BASE;

    transactions.forEach(t => {
      if (t.fuenteFinanciamiento === 'Inyección de Socio (Suma a Inyectado)') {
        totalInyectado += Number(t.amount || 0);
      }
      if (t.fuenteFinanciamiento === 'Ventas Propias (Suma a Retorno)') {
        totalDevuelto += Number(t.amount || 0);
      }
    });

    const deudaPendiente = totalInyectado - totalDevuelto;
    const porcentajeRetorno = totalInyectado > 0 ? (totalDevuelto / totalInyectado) * 100 : 0;

    return { totalInyectado, totalDevuelto, deudaPendiente, porcentajeRetorno };
  }, [transactions]);

  // VENTAS MENSUALES (TABLA)
  const ventasMensuales = useMemo(() => {
    const mesesMap = {};

    Object.keys(dbData).forEach(date => {
      const mes = date.substring(0, 7); // "YYYY-MM"
      if (!mesesMap[mes]) {
        mesesMap[mes] = { name: mes, cartonesFinca: 0, dineroFinca: 0, cartonesDist: 0, dineroDist: 0, totalDinero: 0 };
      }

      const dia = dbData[date];
      (dia.fincaVentas || []).forEach(v => {
        mesesMap[mes].cartonesFinca += Number(v.cantidad || 0);
        mesesMap[mes].dineroFinca += Number(v.total || 0);
        mesesMap[mes].totalDinero += Number(v.total || 0);
      });
      (dia.ventas || []).forEach(v => {
        mesesMap[mes].cartonesDist += Number(v.cantidad || 0);
        mesesMap[mes].dineroDist += Number(v.total || 0);
        mesesMap[mes].totalDinero += Number(v.total || 0);
      });
    });

    return Object.values(mesesMap).sort((a,b) => a.name.localeCompare(b.name));
  }, [dbData]);

  const calculosHoy = useMemo(() => {
    const invTeoricoFinca = {};
    const invTeoricoDist = {};

    TIPOS_HUEVO.forEach(tipo => {
      const produccion = Number(datosDia.fincaProduccion?.[tipo] || 0);
      const ventasFinca = (datosDia.fincaVentas || []).filter(v => v.tipo === tipo).reduce((sum, v) => sum + Number(v.cantidad || 0), 0);
      const transfers = Number(datosDia.fincaTransfers?.[tipo] || 0);
      
      invTeoricoFinca[tipo] = produccion - ventasFinca - transfers;

      const inicial = Number(datosDia.invInicial?.[tipo] || 0);
      const ventasDist = (datosDia.ventas || []).filter(v => v.tipo === tipo).reduce((sum, v) => sum + Number(v.cantidad || 0), 0);
      
      invTeoricoDist[tipo] = inicial + transfers - ventasDist;
    });

    const ventasEfectivoDist = (datosDia.ventas || []).filter(v => Number(v.abonado || 0) > 0 && v.metodoPago === 'Efectivo').reduce((sum, v) => sum + Number(v.abonado || 0), 0);
    const ventasNequiDist = (datosDia.ventas || []).filter(v => Number(v.abonado || 0) > 0 && v.metodoPago === 'Nequi').reduce((sum, v) => sum + Number(v.abonado || 0), 0);
    
    const cobrosEfectivoDist = (datosDia.cobros || []).filter(c => c.metodoPago === 'Efectivo').reduce((sum, c) => sum + Number(c.valor || 0), 0);
    const cobrosNequiDist = (datosDia.cobros || []).filter(c => c.metodoPago === 'Nequi').reduce((sum, c) => sum + Number(c.valor || 0), 0);

    const ventasEfectivoFinca = (datosDia.fincaVentas || []).filter(v => v.metodoPago === 'Efectivo').reduce((sum, v) => sum + Number(v.total || 0), 0);
    const ventasNequiFinca = (datosDia.fincaVentas || []).filter(v => v.metodoPago === 'Nequi').reduce((sum, v) => sum + Number(v.total || 0), 0);

    const gastosHoy = (datosDia.gastos || []).reduce((sum, g) => sum + Number(g.valor || 0), 0);

    const efectivoEnMano = (ventasEfectivoDist + cobrosEfectivoDist + ventasEfectivoFinca) - gastosHoy;
    const totalNequi = ventasNequiDist + cobrosNequiDist + ventasNequiFinca;
    const totalConsignar = efectivoEnMano + totalNequi;

    return { invTeoricoFinca, invTeoricoDist, efectivoEnMano, totalNequi, totalConsignar, gastosHoy };
  }, [datosDia, dbData]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-teal-50 text-teal-900 flex-col gap-4 font-sans">
      <div className="relative">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-teal-600"></div>
        <Sparkles className="absolute inset-0 m-auto text-yellow-500 animate-pulse" size={24} />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-black tracking-wide">Huevos Queens</h2>
        <p className="text-sm font-bold text-teal-600 animate-pulse mt-1">Sincronizando Libro de Cuentas...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-2 md:p-6 font-sans text-slate-800 selection:bg-teal-200">
      
      {/* ALERTA TOAST */}
      {toastMessage && (
        <div className={`fixed bottom-20 left-1/2 transform -translate-x-1/2 z-[110] px-6 py-3 rounded-full shadow-2xl font-bold text-white text-sm transition-all animate-bounce ${toastMessage.includes('❌') || toastMessage.includes('⚠️') ? 'bg-red-600' : 'bg-teal-800'}`}>
          {toastMessage}
        </div>
      )}

      {/* MODAL DE AYUDA AUTH */}
      {mostrarAyudaAuth && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[130] p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-red-100 animate-in zoom-in-95 duration-200 text-slate-800">
            <div className="flex items-center gap-3 mb-4 text-red-600">
              <AlertTriangle size={36} />
              <div>
                <h3 className="text-lg font-black text-slate-900">¡Conexión de Firebase bloqueada!</h3>
                <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold uppercase">Requiere Acción en tu Consola</span>
              </div>
            </div>
            <p className="text-slate-600 text-xs font-semibold leading-relaxed mb-4">
              La base de datos de <strong>Huevos Queens</strong> está online, pero tu servidor rechaza las conexiones anónimas. Sigue estos pasos rápidos en tu cuenta para habilitarlo en 10 segundos:
            </p>
            <div className="bg-slate-50 rounded-2xl p-4 text-xs font-bold space-y-2.5 text-slate-700 border mb-5">
              <p>1️⃣ Abre tu <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-teal-600 underline">Consola de Firebase</a> y entra a tu proyecto.</p>
              <p>2️⃣ En el menú de la izquierda ve a <strong>Authentication</strong> y pulsa en la pestaña <strong>Sign-in method</strong>.</p>
              <p>3️⃣ Busca el proveedor <strong>Anónimo (Anonymous)</strong>, haz clic en editar, selecciona <strong>Habilitar</strong> y presiona <strong>Guardar</strong>.</p>
            </div>
            <button onClick={() => { setMostrarAyudaAuth(false); asegurarAutenticacion(); }} className="w-full bg-teal-800 hover:bg-teal-950 text-white font-black py-3 rounded-xl text-xs shadow-md">
              COMPROBAR CONEXIÓN DE NUEVO
            </button>
          </div>
        </div>
      )}

      {alertConfig.visible && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[120] p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4 text-amber-500">
              <AlertTriangle size={32} className={alertConfig.type === 'danger' ? 'text-red-500' : 'text-amber-500'} />
              <h3 className="text-lg font-black text-slate-900">{alertConfig.title}</h3>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed mb-6">{alertConfig.message}</p>
            <div className="flex gap-2 justify-end">
              <button onClick={closeAlert} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors">Cancelar</button>
              {alertConfig.onConfirm && (
                <button onClick={alertConfig.onConfirm} className={`px-4 py-2 text-white font-bold rounded-xl text-xs shadow-md transition-colors ${alertConfig.type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-teal-600 hover:bg-teal-700'}`}>Confirmar</button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden min-h-[90vh] border border-slate-100 flex flex-col">
        
        {/* HEADER DE LA APLICACIÓN */}
        <div className="bg-teal-800 p-5 text-white shadow-lg sticky top-0 z-[100] border-b-4 border-teal-600">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10">
                <Leaf className="text-yellow-400 w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                  Huevos Queens <span className="text-yellow-400 text-lg">👑</span>
                </h1>
                <p className="text-teal-200 text-xs font-semibold flex items-center gap-2 mt-0.5">
                  {online ? (
                    <span className="flex items-center gap-1"><Wifi size={12} className="text-green-400"/> Sistema Online</span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-300"><WifiOff size={12}/> Modo Offline</span>
                  )}
                  • <Cloud size={12} className="text-teal-400" /> Cloud Sincronizado
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-teal-900/60 p-2.5 rounded-2xl border border-teal-700 w-full md:w-auto justify-between md:justify-start">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-yellow-400" />
                <span className="text-xs font-bold text-teal-100 uppercase tracking-wider">Fecha de Gestión:</span>
              </div>
              <input 
                type="date" 
                value={fecha} 
                onChange={(e) => setFecha(e.target.value)}
                className="bg-white text-slate-800 border-none rounded-xl px-3 py-1 font-extrabold focus:ring-2 focus:ring-teal-400 cursor-pointer text-sm shadow-inner"
              />
            </div>

          </div>

          <div className="flex overflow-x-auto gap-1 mt-5 pb-1 -mx-2 px-2 md:mx-0 md:px-0 scrollbar-none">
            {[
              { id: 'dashboard', label: 'Inversión & Tablero', icon: <PieChartIcon size={16} /> },
              { id: 'finca', label: 'Finca (Granja)', icon: <Leaf size={16} /> },
              { id: 'distribuidora', label: 'Distribuidora', icon: <Package size={16} /> },
              { id: 'finanzas', label: 'Gastos & Nómina', icon: <Receipt size={16} /> },
              { id: 'historial', label: 'Historial Gastos', icon: <ClipboardList size={16} /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setVista(tab.id)}
                className={`flex-none py-2.5 px-4 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shrink-0 ${
                  vista === tab.id 
                    ? 'bg-white text-teal-900 shadow-md transform scale-[1.03]' 
                    : 'text-teal-100 hover:bg-teal-700 hover:text-white'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 md:p-6 flex-1">

          {/* VISTA 1: DASHBOARD DE INVERSION Y VENTAS MENSUALES */}
          {vista === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                
                {/* TARJETA PRINCIPAL DE INVERSIÓN */}
                <div className="lg:col-span-2 bg-gradient-to-br from-teal-900 to-emerald-800 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute right-0 bottom-0 translate-y-10 translate-x-10 opacity-10"><Award size={200} /></div>
                  
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-black uppercase bg-teal-700/60 text-teal-100 px-3 py-1 rounded-full tracking-widest">PROGRESO HACIA PUNTO CERO</span>
                        <h2 className="text-3xl font-black tracking-tight mt-3">Cuenta de Inversión</h2>
                        <p className="text-xs text-teal-200 font-medium mt-1">Suma acumulada que el negocio debe reintegrar a los socios.</p>
                      </div>
                      <Wallet size={36} className="text-yellow-400" />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-8">
                      <div className="bg-white/10 p-3 rounded-2xl border border-white/5">
                        <span className="text-[10px] text-teal-200 font-bold uppercase tracking-wider block">Capital Inyectado (Deuda)</span>
                        <span className="text-xl font-black text-white">${balancePuntoCero.totalInyectado.toLocaleString()}</span>
                      </div>
                      <div className="bg-white/10 p-3 rounded-2xl border border-white/5">
                        <span className="text-[10px] text-teal-200 font-bold uppercase tracking-wider block">Capital Retornado</span>
                        <span className="text-xl font-black text-emerald-300">${balancePuntoCero.totalDevuelto.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-teal-700/60">
                    <div className="flex justify-between text-xs font-bold text-teal-200 mb-2">
                      <span>Retornado al Socio</span>
                      <span>{balancePuntoCero.porcentajeRetorno.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-teal-950/60 rounded-full h-3 overflow-hidden p-0.5 border border-teal-700/40">
                      <div 
                        className="bg-gradient-to-r from-yellow-400 to-green-400 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, balancePuntoCero.porcentajeRetorno)}%` }}
                      ></div>
                    </div>
                  </div>

                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md flex flex-col justify-between">
                  <div className="text-center lg:text-left">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">PENDIENTE POR RECUPERAR</span>
                    <span className="text-4xl font-black tracking-tight text-red-600 block mt-2">
                      -${balancePuntoCero.deudaPendiente.toLocaleString()}
                    </span>
                    <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">
                      Este es el monto exacto que te debe pagar la empresa para llegar a equilibrio de inversión.
                    </p>
                  </div>
                </div>

              </div>

              {/* NUEVO: PANEL SOCIO DIOS (DIEZMO) */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 mt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-100 rounded-2xl text-amber-600 shadow-inner">
                    <Heart size={28} className="fill-amber-500 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="font-black text-amber-900 text-base">Aporte Socio Principal (Dios)</h3>
                    <p className="text-xs text-amber-700 font-semibold mt-0.5">El acumulado actual de ventas totales (Finca + Dist) sin liquidar es de <span className="font-black">${acumuladoDiezmo.totalVentas.toLocaleString()}</span>.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="text-center bg-white px-5 py-2.5 rounded-xl border border-amber-100 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-amber-500 block mb-0.5">10% Pendiente</span>
                    <span className="text-xl font-black text-amber-600">${acumuladoDiezmo.diezmoTotal.toLocaleString()}</span>
                  </div>
                  <button 
                    onClick={liquidarDiezmo} 
                    disabled={acumuladoDiezmo.totalVentas === 0}
                    className="bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white px-5 py-4 rounded-xl font-black text-xs uppercase shadow-md transition-all whitespace-nowrap h-full"
                  >
                    Liquidar Aporte
                  </button>
                </div>
              </div>

              {/* NUEVO: TABLERO DE VENTAS MENSUALES (SIN RELACIONAR CON INVERSION) */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm mt-6">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4 border-b pb-3">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                      <BarChart2 className="text-blue-600 h-5 w-5" /> Consolidado de Ventas Mensuales (Volumen de Negocio)
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">Este tablero mide exclusivamente el volumen de ventas en cartones y dinero. (No afecta la Cuenta de Inversión superior).</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* TABLA DE MESES */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="text-slate-500 uppercase bg-slate-50 border-y border-slate-200 font-bold">
                        <tr>
                          <th className="px-3 py-3">Mes</th>
                          <th className="px-3 py-3 text-center">Cartones (Finca)</th>
                          <th className="px-3 py-3 text-center">Cartones (Dist)</th>
                          <th className="px-3 py-3 text-right">Total Ventas ($)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ventasMensuales.map((m, i) => (
                          <tr key={i} className="border-b font-semibold text-slate-700 hover:bg-slate-50">
                            <td className="px-3 py-3 font-black text-blue-800">{m.name}</td>
                            <td className="px-3 py-3 text-center bg-teal-50/30">{m.cartonesFinca}</td>
                            <td className="px-3 py-3 text-center bg-emerald-50/30">{m.cartonesDist}</td>
                            <td className="px-3 py-3 text-right font-black text-slate-900">${m.totalDinero.toLocaleString()}</td>
                          </tr>
                        ))}
                        {ventasMensuales.length === 0 && (
                          <tr><td colSpan="4" className="text-center py-6 text-slate-400 italic">No hay ventas registradas aún.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* GRÁFICA DE VENTAS */}
                  <div className="h-64 bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-center">
                    {ventasMensuales.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ventasMensuales}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => `$${v/1000}k`} />
                          <Tooltip formatter={(value) => "$" + value.toLocaleString()} cursor={{fill: '#f1f5f9'}} />
                          <Bar dataKey="totalDinero" name="Total Ventas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <span className="text-xs text-slate-400 italic">La gráfica aparecerá al registrar ventas.</span>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* VISTA 2: FINCA (GRANJA) */}
          {vista === 'finca' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* PANEL DE ACUMULADO DE VENTAS SIN PAGAR */}
              <div className="bg-blue-50 border border-blue-200 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-2xl text-blue-700">
                    <CheckSquare size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-blue-900 text-sm">Ventas Acumuladas Pendientes (Día tras día)</h3>
                    <p className="text-xs text-blue-700 font-semibold mt-0.5">Llevas <span className="font-black">{acumuladoFincaPendiente.totalCartones} cartones</span> fiaos/pendientes por un total de <span className="font-black text-base">${acumuladoFincaPendiente.totalDinero.toLocaleString()}</span>.</p>
                  </div>
                </div>
                <button 
                  onClick={liquidarVentasFinca} 
                  disabled={acumuladoFincaPendiente.totalCartones === 0}
                  className="bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 text-white px-5 py-3 rounded-xl font-black text-xs uppercase shadow-md transition-all whitespace-nowrap"
                >
                  Liquidar y Poner en Cero
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                <div className="lg:col-span-5 bg-teal-50/50 rounded-3xl p-5 border border-teal-200/50 shadow-sm flex flex-col">
                  <div className="flex items-center gap-2 border-b border-teal-100 pb-3 mb-4">
                    <Sparkles className="text-teal-600" />
                    <div>
                      <h2 className="font-black text-teal-950 text-base">Producción Diaria de Finca</h2>
                      <p className="text-[10px] text-teal-600 font-bold uppercase tracking-wider">Huevos Recolectados Hoy ({fecha})</p>
                    </div>
                  </div>

                  <div className="space-y-2.5 flex-1">
                    {TIPOS_HUEVO.map(tipo => (
                      <div key={tipo} className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-100 shadow-sm hover:border-teal-300 transition-colors">
                        <span className="font-extrabold text-slate-700 w-24 pl-2 text-sm">{tipo}</span>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            placeholder="0" 
                            className="w-24 p-2 border border-slate-200 rounded-xl text-center font-black text-teal-800 focus:ring-2 focus:ring-teal-400 outline-none text-sm" 
                            value={datosDia.fincaProduccion?.[tipo] || ''} 
                            onChange={(e) => handleFincaProduccionChange(tipo, e.target.value)} 
                          />
                          <span className="text-xs font-bold text-slate-400">Cartones</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* SUMATORIA TOTAL DE PRODUCCIÓN */}
                  <div className="mt-4 pt-3 border-t border-teal-200 flex justify-between items-center bg-teal-100 p-3 rounded-2xl">
                    <span className="font-black text-teal-900 text-sm uppercase">Total Cartones Hoy:</span>
                    <span className="font-black text-xl text-teal-700">{totalProduccionHoy}</span>
                  </div>
                </div>

                <div className="lg:col-span-7 space-y-6">
                  
                  <div className="bg-amber-50/50 rounded-3xl p-5 border border-amber-200/50 shadow-sm">
                    <div className="flex items-center gap-2 border-b border-amber-100 pb-3 mb-4">
                      <ArrowRight className="text-amber-600" />
                      <div>
                        <h2 className="font-black text-amber-950 text-base">Despacho a Distribuidora</h2>
                        <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Cajas Trasladadas para la venta en Distribuidora</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {TIPOS_HUEVO.map(tipo => (
                        <div key={tipo} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1 items-center">
                          <span className="text-xs font-extrabold text-slate-600">{tipo}</span>
                          <input 
                            type="number" 
                            placeholder="0" 
                            className="w-full p-2 border border-slate-200 rounded-xl text-center font-black text-amber-800 focus:ring-2 focus:ring-amber-400 outline-none text-sm" 
                            value={datosDia.fincaTransfers?.[tipo] || ''} 
                            onChange={(e) => handleFincaTransferChange(tipo, e.target.value)} 
                          />
                          <span className="text-[9px] font-bold text-slate-400">Transferido</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-amber-600 mt-3 text-center font-bold italic">* Estas cantidades sumarán automáticamente al inventario de la distribuidora hoy.</p>
                  </div>

                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
                    <h2 className="font-black text-slate-800 mb-4 flex items-center gap-2 text-base border-b pb-2">
                      <Calculator className="h-5 w-5 text-teal-600" /> Registrar Venta Directa de Finca
                    </h2>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Cliente</label>
                        <input 
                          placeholder="Nombre" 
                          className="w-full p-2 border rounded-xl focus:ring-2 focus:ring-teal-400 outline-none text-xs font-semibold" 
                          value={nuevaVentaFinca.cliente} 
                          onChange={e => setNuevaVentaFinca({...nuevaVentaFinca, cliente: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Cant. Cartones</label>
                        <input 
                          type="number" 
                          placeholder="#" 
                          className="w-full p-2 border rounded-xl focus:ring-2 focus:ring-teal-400 outline-none text-xs font-semibold text-center" 
                          value={nuevaVentaFinca.cantidad} 
                          onChange={e => setNuevaVentaFinca({...nuevaVentaFinca, cantidad: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tipo Huevo</label>
                        <select 
                          className="w-full p-2 border rounded-xl bg-white focus:ring-2 focus:ring-teal-400 outline-none text-xs font-bold text-slate-700" 
                          value={nuevaVentaFinca.tipo} 
                          onChange={e => setNuevaVentaFinca({...nuevaVentaFinca, tipo: e.target.value})}
                        >
                          {TIPOS_HUEVO.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Precio Unitario</label>
                        <input 
                          type="number" 
                          placeholder="$ Valor" 
                          className="w-full p-2 border rounded-xl focus:ring-2 focus:ring-teal-400 outline-none text-xs font-semibold text-center" 
                          value={nuevaVentaFinca.precioUnitario} 
                          onChange={e => setNuevaVentaFinca({...nuevaVentaFinca, precioUnitario: e.target.value})} 
                        />
                      </div>
                    </div>

                    <div className="flex gap-4 items-center mb-4">
                      <span className="text-xs font-bold text-slate-500">Método de pago:</span>
                      <label className="flex items-center gap-1.5 text-xs font-extrabold text-slate-600 cursor-pointer">
                        <input 
                          type="radio" 
                          name="pagoFinca" 
                          checked={nuevaVentaFinca.metodoPago === 'Efectivo'} 
                          onChange={() => setNuevaVentaFinca({...nuevaVentaFinca, metodoPago: 'Efectivo'})} 
                        /> 
                        Efectivo
                      </label>
                      <label className="flex items-center gap-1.5 text-xs font-extrabold text-slate-600 cursor-pointer">
                        <input 
                          type="radio" 
                          name="pagoFinca" 
                          checked={nuevaVentaFinca.metodoPago === 'Nequi'} 
                          onChange={() => setNuevaVentaFinca({...nuevaVentaFinca, metodoPago: 'Nequi'})} 
                        /> 
                        Nequi
                      </label>
                    </div>

                    <button 
                      onClick={agregarVentaFinca} 
                      className="w-full bg-teal-700 hover:bg-teal-800 text-white font-extrabold py-3.5 rounded-2xl shadow-lg flex items-center justify-center gap-2 text-sm transition-transform active:scale-95"
                    >
                      <PlusCircle size={18} /> Registrar Venta y Sumar al Acumulado
                    </button>
                  </div>

                </div>

              </div>

              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-extrabold text-slate-800 text-sm">Registro de Ventas en Finca ({fecha})</h3>
                  <span className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-full font-black">
                    Total Finca Hoy: ${(datosDia.fincaVentas || []).reduce((s,v) => s + Number(v.total || 0), 0).toLocaleString()}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-600 uppercase bg-slate-100 border-b">
                      <tr>
                        <th className="px-4 py-3">Cliente</th>
                        <th className="px-4 py-3 text-center">Cant. Cartones</th>
                        <th className="px-4 py-3 text-center">Tipo Huevo</th>
                        <th className="px-4 py-3 text-right">Precio Unitario</th>
                        <th className="px-4 py-3 text-right">Total</th>
                        <th className="px-4 py-3 text-center">Pago</th>
                        <th className="px-4 py-3 text-center">Estado Acumulado</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(datosDia.fincaVentas || []).map(v => (
                        <tr key={v.id} className="border-b hover:bg-slate-50 font-semibold text-slate-700">
                          <td className="px-4 py-3 font-bold">{v.cliente}</td>
                          <td className="px-4 py-3 text-center">{v.cantidad}</td>
                          <td className="px-4 py-3 text-center"><span className="bg-teal-50 text-teal-800 px-2 py-0.5 rounded-lg text-xs">{v.tipo}</span></td>
                          <td className="px-4 py-3 text-right">${v.precioUnitario.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-black text-slate-900">${v.total.toLocaleString()}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${v.metodoPago === 'Nequi' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>{v.metodoPago}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {v.liquidado ? (
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">Liquidado</span>
                            ) : (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-full">Pendiente</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => borrarVentaFinca(v.id)} className="text-slate-300 hover:text-red-500 p-1"><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))}
                      {(datosDia.fincaVentas || []).length === 0 && (
                        <tr>
                          <td colSpan="8" className="text-center py-8 text-slate-400 italic font-semibold">No se han registrado ventas en finca hoy.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* VISTA 3: DISTRIBUIDORA */}
          {vista === 'distribuidora' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-300">
              
              <div className="lg:col-span-4 space-y-6">
                
                <div className="bg-teal-50/50 p-5 rounded-3xl border border-teal-200/50 shadow-sm flex flex-col">
                  <h2 className="font-black text-teal-950 mb-3 flex items-center gap-2 border-b border-teal-200/60 pb-2 text-sm">
                    <Package className="h-5 w-5 text-teal-700" /> 1. Stock Inicial Distribuidora
                  </h2>
                  <div className="space-y-2 flex-1">
                    {TIPOS_HUEVO.map(tipo => (
                      <div key={tipo} className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
                        <span className="font-bold text-slate-700 w-16 pl-2 text-xs">{tipo}</span>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            placeholder="0" 
                            className="w-20 p-1.5 border border-slate-200 rounded-xl text-center font-bold text-teal-800 focus:ring-2 focus:ring-teal-400 outline-none text-xs" 
                            value={datosDia.invInicial?.[tipo] || ''} 
                            onChange={(e) => handleInvInicialChange(tipo, e.target.value)} 
                          />
                          <span className="text-[10px] font-bold text-slate-400">Restante</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* SUMATORIA TOTAL DE STOCK INICIAL */}
                  <div className="mt-4 pt-3 border-t border-teal-200 flex justify-between items-center bg-teal-100 p-3 rounded-2xl">
                    <span className="font-black text-teal-900 text-xs uppercase">Total Cartones Inicio:</span>
                    <span className="font-black text-lg text-teal-700">{totalStockInicial}</span>
                  </div>
                  <p className="text-[10px] text-teal-600 mt-2 text-center font-bold italic">* Hereda automáticamente el excedente de ayer.</p>
                </div>

                <div className="bg-blue-50/50 p-5 rounded-3xl border border-blue-200/50 shadow-sm">
                  <h2 className="font-black text-blue-950 mb-3 flex items-center gap-2 border-b border-blue-200/60 pb-2 text-sm">
                    <Users className="h-5 w-5 text-blue-700" /> Cartera de Clientes (Distribuidora)
                  </h2>
                  
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-2 text-blue-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Buscar deudor..." 
                      className="w-full pl-9 p-2 rounded-xl border border-blue-200 shadow-inner focus:ring-2 focus:ring-blue-400 outline-none text-xs font-bold text-slate-700" 
                      value={busquedaDeudor} 
                      onChange={(e) => setBusquedaDeudor(e.target.value)} 
                    />
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {listaDeudores.filter(d => d.cliente.toLowerCase().includes(busquedaDeudor.toLowerCase())).map((item) => (
                      <div key={item.id} className="bg-white p-3 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-red-400"></div>
                        <div className="flex flex-col gap-1 pl-1">
                          <h4 className="font-extrabold text-xs text-slate-800">{item.cliente}</h4>
                          <span className="text-[10px] text-slate-400 font-bold">{item.fechaOriginal} • {item.cantidad} de {item.tipo}</span>
                          <span className="text-red-600 font-extrabold text-xs bg-red-50 py-0.5 px-2 rounded-lg w-max mt-1">Debe: ${item.saldoPendiente.toLocaleString()}</span>
                          
                          {deudorSeleccionado?.id === item.id ? (
                            <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-2">
                              <input 
                                type="number" 
                                className="w-full p-2 border rounded-xl text-center font-bold text-xs" 
                                placeholder="$ Monto Abono" 
                                value={montoAbono} 
                                onChange={(e) => setMontoAbono(e.target.value)} 
                              />
                              <div className="flex gap-1 justify-center bg-slate-50 p-1 rounded-xl">
                                <button onClick={() => setMetodoPagoAbono('Efectivo')} className={`px-2 py-1 rounded-lg text-[10px] font-black ${metodoPagoAbono === 'Efectivo' ? 'bg-teal-600 text-white' : 'text-slate-500'}`}>EF</button>
                                <button onClick={() => setMetodoPagoAbono('Nequi')} className={`px-2 py-1 rounded-lg text-[10px] font-black ${metodoPagoAbono === 'Nequi' ? 'bg-purple-600 text-white' : 'text-slate-500'}`}>NEQUI</button>
                              </div>
                              <div className="flex gap-1">
                                <button onClick={realizarCobroDeuda} className="bg-teal-600 text-white px-3 py-1.5 rounded-xl font-bold text-[10px] hover:bg-teal-700 flex-1">Abonar</button>
                                <button onClick={() => setDeudorSeleccionado(null)} className="bg-slate-200 text-slate-600 px-2 py-1.5 rounded-xl font-bold text-[10px]">X</button>
                              </div>
                            </div>
                          ) : (
                            <button 
                              onClick={() => { setDeudorSeleccionado(item); setMontoAbono(item.saldoPendiente); }} 
                              className="bg-blue-600 text-white px-3 py-1 rounded-xl font-bold text-[10px] hover:bg-blue-700 mt-2 w-max shadow-sm"
                            >
                              Pagar Abono
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {listaDeudores.length === 0 && <p className="text-center text-[11px] text-slate-400 font-bold py-4">No hay deudas por cobrar.</p>}
                  </div>
                </div>

              </div>

              <div className="lg:col-span-8 space-y-6">
                
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                  <h2 className="font-black text-slate-800 mb-4 flex items-center gap-2 text-sm border-b pb-2">
                    <Calculator className="h-5 w-5 text-emerald-600" /> 2. Nueva Venta Distribuidora
                  </h2>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 items-end mb-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase">Cliente</label>
                      <input 
                        placeholder="Nombre" 
                        className="w-full p-2 border rounded-xl focus:ring-2 focus:ring-teal-400 outline-none text-xs font-bold" 
                        value={nuevaVentaDist.cliente} 
                        onChange={e => setNuevaVentaDist({...nuevaVentaDist, cliente: e.target.value})} 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase">Cant. Cartones</label>
                      <input 
                        type="number" 
                        placeholder="0" 
                        className="w-full p-2 border rounded-xl focus:ring-2 focus:ring-teal-400 outline-none text-xs text-center font-bold" 
                        value={nuevaVentaDist.cantidad} 
                        onChange={e => setNuevaVentaDist({...nuevaVentaDist, cantidad: e.target.value})} 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase">Tipo</label>
                      <select 
                        className="w-full p-2 border rounded-xl bg-white focus:ring-2 focus:ring-teal-400 outline-none text-xs font-bold" 
                        value={nuevaVentaDist.tipo} 
                        onChange={e => setNuevaVentaDist({...nuevaVentaDist, tipo: e.target.value})}
                      >
                        {TIPOS_HUEVO.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase">Precio Carton ($)</label>
                      <input 
                        type="number" 
                        placeholder="$" 
                        className="w-full p-2 border rounded-xl focus:ring-2 focus:ring-teal-400 outline-none text-xs text-center font-bold" 
                        value={nuevaVentaDist.precioUnitario} 
                        onChange={e => setNuevaVentaDist({...nuevaVentaDist, precioUnitario: e.target.value})} 
                      />
                    </div>

                    <div className="col-span-2 pt-2 border-t mt-2 grid grid-cols-2 gap-2">
                      <div 
                        onClick={() => setNuevaVentaDist({...nuevaVentaDist, pagadoAElla: true})}
                        className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-colors ${nuevaVentaDist.pagadoAElla ? 'bg-teal-50 border-teal-300' : 'bg-slate-50 border-slate-200'}`}
                      >
                        <CheckCircle size={16} className={nuevaVentaDist.pagadoAElla ? 'text-teal-600' : 'text-slate-300'} />
                        <span className="text-[11px] font-black text-slate-700">Pagado</span>
                      </div>
                      <div 
                        onClick={() => setNuevaVentaDist({...nuevaVentaDist, pagadoAElla: false})}
                        className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-colors ${!nuevaVentaDist.pagadoAElla ? 'bg-red-50 border-red-300' : 'bg-slate-50 border-slate-200'}`}
                      >
                        <CheckCircle size={16} className={!nuevaVentaDist.pagadoAElla ? 'text-red-600' : 'text-slate-300'} />
                        <span className="text-[11px] font-black text-slate-700">Debe</span>
                      </div>
                    </div>

                    {nuevaVentaDist.pagadoAElla && (
                      <div className="col-span-2 flex gap-4 justify-center items-center h-10 mt-2 border-t">
                        <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 cursor-pointer">
                          <input type="radio" checked={nuevaVentaDist.metodoPago === 'Efectivo'} onChange={() => setNuevaVentaDist({...nuevaVentaDist, metodoPago: 'Efectivo'})} /> Efectivo
                        </label>
                        <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 cursor-pointer">
                          <input type="radio" checked={nuevaVentaDist.metodoPago === 'Nequi'} onChange={() => setNuevaVentaDist({...nuevaVentaDist, metodoPago: 'Nequi'})} /> Nequi
                        </label>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={agregarVentaDist} 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 rounded-xl flex justify-center items-center gap-2 text-xs shadow-md transition-transform active:scale-95"
                  >
                    <PlusCircle size={16} /> Agregar Venta Distribuidora
                  </button>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                  <div className="bg-slate-50 p-4 border-b">
                    <h3 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">Ventas Distribuidora de hoy ({fecha})</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="text-slate-600 bg-slate-100 uppercase">
                        <tr>
                          <th className="px-4 py-3">Cliente</th>
                          <th className="px-4 py-3 text-center">Cant.</th>
                          <th className="px-4 py-3 text-center">Tipo</th>
                          <th className="px-4 py-3 text-right">Total</th>
                          <th className="px-4 py-3 text-center">Forma Pago</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(datosDia.ventas || []).map(v => (
                          <tr key={v.id} className="border-b font-semibold text-slate-700">
                            <td className="px-4 py-3 font-bold">{v.cliente}</td>
                            <td className="px-4 py-3 text-center">{v.cantidad}</td>
                            <td className="px-4 py-3 text-center"><span className="bg-slate-100 px-2 py-0.5 rounded text-[10px]">{v.tipo}</span></td>
                            <td className="px-4 py-3 text-right font-bold text-slate-900">${v.total.toLocaleString()}</td>
                            <td className="px-4 py-3 text-center">
                              {Number(v.abonado || 0) >= Number(v.total || 0) ? (
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${v.metodoPago === 'Nequi' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>{v.metodoPago}</span>
                              ) : (
                                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[9px] font-black">DEUDOR</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button onClick={() => borrarVentaDist(v.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                            </td>
                          </tr>
                        ))}
                        {(datosDia.ventas || []).length === 0 && (
                          <tr><td colSpan="6" className="text-center py-6 text-slate-400 italic">No hay ventas registradas.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-slate-800 text-white rounded-3xl p-5 shadow-lg border-t-4 border-yellow-500">
                  <h3 className="font-bold text-sm text-yellow-400 mb-3 flex items-center gap-2"><CheckCircle size={18} /> Balance Físico de Huevos (Finca vs Distribuidora)</h3>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-700">
                          <th className="text-left pb-2">Tipo de Huevo</th>
                          <th className="text-center pb-2">Fórmula Teórica (Finca)</th>
                          <th className="text-center pb-2">Teórico (Distribuidora)</th>
                          <th className="text-center pb-2 text-yellow-400">Físico Distribuidora (Real)</th>
                          <th className="text-center pb-2">Dif.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {TIPOS_HUEVO.map(tipo => {
                          const teoricoFinca = calculosHoy.invTeoricoFinca[tipo];
                          const teoricoDist = calculosHoy.invTeoricoDist[tipo];
                          
                          if (teoricoFinca === 0 && teoricoDist === 0 && !datosDia.invFinalFisico?.[tipo]) return null;
                          
                          const fisicoReal = Number(datosDia.invFinalFisico?.[tipo] || 0);
                          const diff = fisicoReal - teoricoDist;

                          return (
                            <tr key={tipo} className="border-b border-slate-700/50">
                              <td className="py-2 font-bold text-slate-200">{tipo}</td>
                              <td className="py-2 text-center text-teal-300 font-semibold">{teoricoFinca} cartones</td>
                              <td className="py-2 text-center text-slate-300 font-semibold">{teoricoDist} cartones</td>
                              <td className="py-2 text-center">
                                <input 
                                  type="number" 
                                  className="w-14 bg-slate-950 border border-slate-600 text-center rounded-xl p-1 text-yellow-400 font-black text-xs outline-none" 
                                  placeholder="0"
                                  value={datosDia.invFinalFisico?.[tipo] || ''}
                                  onChange={(e) => handleInvFinalChange(tipo, e.target.value)}
                                />
                              </td>
                              <td className={`py-2 text-center font-black ${diff < 0 ? 'text-red-400' : diff > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                                {fisicoReal > 0 ? (diff === 0 ? 'OK' : diff) : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* VISTA 4: FINANZAS Y GASTOS */}
          {vista === 'finanzas' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-300">
              
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-5 shadow-md">
                <h2 className="font-black text-slate-800 text-base mb-4 flex items-center gap-2 border-b pb-2">
                  <Receipt className="text-teal-700" /> Registro de Egresos y Nóminas
                </h2>

                <form onSubmit={guardarMovimientoFinanciero} className="space-y-4">
                  
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Tipo de Gasto</label>
                    <select 
                      className="w-full p-2.5 bg-slate-50 border rounded-2xl text-xs font-bold text-slate-700" 
                      value={nuevoMovimientoFinanciero.tipo} 
                      onChange={e => setNuevoMovimientoFinanciero({...nuevoMovimientoFinanciero, tipo: e.target.value})}
                    >
                      <option value="Gasto de la Granja">Gasto de la Granja (Insumos/Servicios)</option>
                      <option value="Pago de Nómina">Pago de Nómina (Samuel/Merly/Extras)</option>
                      <option value="Otros Gastos">Otros Gastos</option>
                    </select>
                  </div>

                  {nuevoMovimientoFinanciero.tipo === 'Pago de Nómina' && (
                    <div className="bg-teal-50 p-3 rounded-2xl space-y-3 border border-teal-100">
                      <div>
                        <label className="text-[10px] font-black text-teal-800 uppercase block mb-1">Personal</label>
                        <select 
                          className="w-full p-2 bg-white border rounded-xl text-xs font-bold text-slate-700" 
                          value={nuevoMovimientoFinanciero.empleadoNombre} 
                          onChange={e => setNuevoMovimientoFinanciero({...nuevoMovimientoFinanciero, empleadoNombre: e.target.value})}
                        >
                          <option value="Samuel">Samuel (Maneja la Granja - Fijo)</option>
                          <option value="Merly">Merly (Distribuidora - Fijo)</option>
                          <option value="Ayudante Extra">Ayudante Extra (Temporal)</option>
                        </select>
                      </div>

                      {nuevoMovimientoFinanciero.empleadoNombre === 'Ayudante Extra' && (
                        <div>
                          <label className="text-[10px] font-black text-teal-800 uppercase block mb-1">Nombre del Asistente</label>
                          <input 
                            placeholder="Ej: Pedro Pérez" 
                            className="w-full p-2 bg-white border rounded-xl text-xs font-semibold" 
                            value={nuevoMovimientoFinanciero.ayudanteNombre} 
                            onChange={e => setNuevoMovimientoFinanciero({...nuevoMovimientoFinanciero, ayudanteNombre: e.target.value})} 
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Monto ($)</label>
                    <input 
                      type="number" 
                      placeholder="0" 
                      className="w-full p-2.5 border rounded-2xl text-sm font-black text-slate-800 outline-none focus:ring-2 focus:ring-teal-400" 
                      value={nuevoMovimientoFinanciero.valor} 
                      onChange={e => setNuevoMovimientoFinanciero({...nuevoMovimientoFinanciero, valor: e.target.value})} 
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Concepto / Detalle</label>
                    <input 
                      placeholder="Ej: Compra de Purina Inicio, Vacunas, Servicios públicos, etc." 
                      className="w-full p-2.5 border rounded-2xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-teal-400" 
                      value={nuevoMovimientoFinanciero.concepto} 
                      onChange={e => setNuevoMovimientoFinanciero({...nuevoMovimientoFinanciero, concepto: e.target.value})} 
                    />
                  </div>

                  {nuevoMovimientoFinanciero.tipo === 'Gasto de la Granja' && (
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Categoría</label>
                      <select 
                        className="w-full p-2.5 bg-slate-50 border rounded-2xl text-xs font-bold text-slate-700" 
                        value={nuevoMovimientoFinanciero.categoria} 
                        onChange={e => setNuevoMovimientoFinanciero({...nuevoMovimientoFinanciero, categoria: e.target.value})}
                      >
                        <option value="Insumos">Insumos (Alimento, panales, etc.)</option>
                        <option value="Infraestructura">Infraestructura (Construcción, herramientas)</option>
                        <option value="Aves">Aves (Nuevas gallinas, repuestos)</option>
                        <option value="Sanidad">Sanidad (Vacunas, medicamentos)</option>
                      </select>
                    </div>
                  )}

                  <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 mt-2">
                    <label className="text-[10px] font-black text-amber-950 uppercase block mb-1">Fuente de Financiamiento</label>
                    <select 
                      className="w-full p-2 bg-white border rounded-xl text-xs font-bold text-slate-700" 
                      value={nuevoMovimientoFinanciero.fuenteFinanciamiento} 
                      onChange={e => setNuevoMovimientoFinanciero({...nuevoMovimientoFinanciero, fuenteFinanciamiento: e.target.value})}
                    >
                      <option value="Ventas Propias (Suma a Retorno)">Cubierto por las Ventas Propias (Suma a Retorno)</option>
                      <option value="Inyección de Socio (Suma a Inyectado)">Puesto de tu bolsillo (Suma a Inyección / Deuda)</option>
                    </select>
                    <p className="text-[9px] font-bold text-amber-700 mt-1 italic leading-tight">
                      * Define si la granja se pagó a sí misma (retorno) o si el socio tuvo que meter la mano al bolsillo (deuda).
                    </p>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full bg-teal-800 hover:bg-teal-900 text-white py-3 rounded-2xl font-black text-xs shadow-lg flex justify-center items-center gap-2 tracking-wide uppercase transition-transform active:scale-95"
                  >
                    <Save size={16} /> Registrar Movimiento
                  </button>

                </form>

              </div>

              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-5 shadow-md flex flex-col justify-between">
                
                <div>
                  <h2 className="font-black text-slate-800 text-base mb-4 flex items-center gap-2 border-b pb-2">
                    <List className="text-teal-700" /> Registro de Caja Diaria ({fecha})
                  </h2>

                  <div className="bg-red-50 p-4 rounded-3xl border border-red-200 shadow-sm mb-4">
                    <h3 className="font-extrabold text-xs text-red-900 mb-2 flex items-center gap-1"><Truck size={14} /> Gastos Operativos del Día en Distribuidora</h3>
                    
                    <div className="flex gap-2 mb-3">
                      <input 
                        placeholder="Gasolina, empaques, comida..." 
                        className="w-full p-2 border rounded-xl text-xs font-semibold bg-white" 
                        value={nuevoGastoDist.concepto} 
                        onChange={e => setNuevoGastoDist({...nuevoGastoDist, concepto: e.target.value})} 
                      />
                      <input 
                        type="number" 
                        placeholder="$" 
                        className="w-20 p-2 border rounded-xl text-xs text-center font-bold bg-white" 
                        value={nuevoGastoDist.valor} 
                        onChange={e => setNuevoGastoDist({...nuevoGastoDist, valor: e.target.value})} 
                      />
                      <button onClick={agregarGastoDist} className="bg-red-600 text-white p-2 rounded-xl hover:bg-red-700 shadow-md"><PlusCircle size={18}/></button>
                    </div>

                    <ul className="text-xs space-y-1">
                      {(datosDia.gastos || []).map(g => (
                        <li key={g.id} className="flex justify-between items-center bg-white p-2 rounded-xl border border-red-100">
                          <span className="text-slate-700 font-semibold">{g.concepto}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-red-600">-${g.valor.toLocaleString()}</span>
                            <button onClick={() => borrarGastoDist(g.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={12}/></button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-green-50 p-4 rounded-3xl border border-green-200 mb-4">
                    <h3 className="font-extrabold text-xs text-green-900 mb-2 flex items-center gap-1"><Wallet size={14}/> Cobros de Hoy (Abonos de Deudas Viejas)</h3>
                    {(datosDia.cobros || []).length > 0 ? (
                      <ul className="space-y-1.5 text-xs">
                        {datosDia.cobros.map(c => (
                          <li key={c.id} className="bg-white p-2 rounded-xl border border-green-100 flex justify-between items-center">
                            <div>
                              <span className="font-extrabold text-slate-700">{c.cliente}</span>
                              <span className="text-[10px] text-green-600 ml-2 bg-green-50 px-2 py-0.5 rounded-full font-bold">{c.nota}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] bg-purple-100 text-purple-600 px-1 rounded font-black">{c.metodoPago}</span>
                              <span className="font-extrabold text-green-600">+${c.valor.toLocaleString()}</span>
                              <button onClick={() => borrarCobroHoy(c)} className="text-slate-300 hover:text-red-500"><Trash2 size={12}/></button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[10px] text-green-700 italic font-bold">Nadie ha pagado deudas hoy.</p>
                    )}
                  </div>

                </div>

                <div className="bg-slate-900 text-white p-5 rounded-3xl border-t-4 border-emerald-500 shadow-xl">
                  <h3 className="font-black text-sm text-yellow-400 border-b border-slate-800 pb-2 flex items-center gap-2"><CheckCircle size={18} /> Resumen de Caja Real Unificada</h3>
                  
                  <div className="space-y-2 mt-4 text-xs font-semibold text-slate-300">
                    <div className="flex justify-between">
                      <span>(+) Ventas Hoy (Efectivo Distribuidora):</span>
                      <span>${((datosDia.ventas || []).filter(v => Number(v.abonado || 0) > 0 && v.metodoPago === 'Efectivo').reduce((sum, v) => sum + Number(v.abonado || 0), 0)).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>(+) Ventas Hoy (Efectivo Finca):</span>
                      <span>${((datosDia.fincaVentas || []).filter(v => v.metodoPago === 'Efectivo').reduce((sum, v) => sum + Number(v.total || 0), 0)).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-green-300">
                      <span>(+) Cobro de Cartera (Efectivo):</span>
                      <span>+${((datosDia.cobros || []).filter(c => c.metodoPago === 'Efectivo').reduce((sum, c) => sum + Number(c.valor || 0), 0)).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-red-300 border-b border-slate-800 pb-2">
                      <span>(-) Gastos del día (Caja Distribuidora):</span>
                      <span>-${calculosHoy.gastosHoy.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between font-black text-base text-green-400 pt-2 border-b border-slate-800 pb-2">
                      <span>= EFECTIVO EN MANO:</span>
                      <span>${calculosHoy.efectivoEnMano.toLocaleString()}</span>
                    </div>

                    <div className="pt-2">
                      <div className="flex justify-between text-purple-300 mb-1">
                        <span>(+) Recibido en Nequi Hoy (Ventas + Cartera):</span>
                        <span>${calculosHoy.totalNequi.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-black text-lg text-white bg-teal-800 p-3 rounded-2xl mt-2 border border-teal-700">
                        <span>TOTAL A CONSIGNAR:</span>
                        <span>${calculosHoy.totalConsignar.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* VISTA 5: HISTORIAL CONTABLE */}
          {vista === 'historial' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              <div className="bg-slate-100 p-4 rounded-3xl flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <h2 className="font-black text-slate-800">Contabilidad Financiera de Gastos</h2>
                  <p className="text-xs text-slate-500 font-semibold">Listado histórico de egresos operativos y aportes, separados de las ventas.</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-600 bg-slate-100 uppercase">
                      <tr>
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3">Concepto</th>
                        <th className="px-4 py-3">Categoría / Tipo</th>
                        <th className="px-4 py-3">Financiamiento (Quien pagó)</th>
                        <th className="px-4 py-3 text-right">Monto</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {transactions.map(t => {
                        const esInyeccion = t.fuenteFinanciamiento === 'Inyección de Socio (Suma a Inyectado)';
                        
                        return (
                          <tr key={t.id} className="hover:bg-slate-50 font-semibold text-slate-700">
                            <td className="px-4 py-3 text-xs text-slate-500 font-bold">{t.date}</td>
                            <td className="px-4 py-3 font-bold text-slate-900">{t.description}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-slate-100 text-slate-600">
                                {t.category || t.type}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
                                esInyeccion ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                              }`}>
                                {esInyeccion ? 'Inyección Socio' : 'Ventas Propias'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-black text-slate-800">
                              ${Number(t.amount || 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button onClick={() => borrarMovimientoFinanciero(t.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                            </td>
                          </tr>
                        );
                      })}
                      {transactions.length === 0 && (
                        <tr><td colSpan="6" className="text-center py-10 text-slate-400 italic font-semibold">No se han registrado transacciones financieras en el ledger histórico.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>

        <div className="bg-slate-100 p-4 border-t border-slate-200 text-center text-xs font-bold text-slate-400 mt-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>👑 Huevos Queens - Finca & Distribuidora</span>
          <span>Desarrollado para unificación inteligente y toma de decisiones precisas • v4.0</span>
        </div>

      </div>
    </div>
  );
}