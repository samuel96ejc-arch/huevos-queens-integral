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
  Award
} from 'lucide-react';
import { 
  PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';

import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
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

const appId = 'huevos-queens-unified-v3';
const COLORS = ['#0f766e', '#d97706', '#2563eb', '#dc2626', '#7c3aed', '#db2777', '#4b5563'];
const TIPOS_HUEVO = ['Jumbo', 'AAA', 'AA', 'A', 'B', 'C', 'Rotos'];

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
  const [user, setUser] = useState<any>(null);
  const [dbData, setDbData] = useState<Record<string, any>>({}); 
  const [transactions, setTransactions] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [vista, setVista] = useState('dashboard'); 
  const [online, setOnline] = useState(navigator.onLine);

  // Estados para saldos manuales iniciales (Punto Cero)
  const [baseInyeccion, setBaseInyeccion] = useState<number>(0);
  const [baseRetorno, setBaseRetorno] = useState<number>(0);
  const [inputBaseInyeccion, setInputBaseInyeccion] = useState<string>('0');
  const [inputBaseRetorno, setInputBaseRetorno] = useState<string>('0');

  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'success', onConfirm: null });
  const [toastMessage, setToastMessage] = useState('');

  const [nuevaVentaDist, setNuevaVentaDist] = useState({ cliente: '', cantidad: '', tipo: 'A', precioUnitario: '', pagadoAElla: true, metodoPago: 'Efectivo' });
  const [nuevaVentaFinca, setNuevaVentaFinca] = useState({ cliente: '', cantidad: '', tipo: 'A', precioUnitario: '', metodoPago: 'Efectivo' });
  const [nuevoGastoDist, setNuevoGastoDist] = useState({ concepto: '', valor: '' });
  
  const [nuevoMovimientoFinanciero, setNuevoMovimientoFinanciero] = useState({
    tipo: 'gasto_granja', 
    concepto: '',
    valor: '',
    categoria: 'Insumos', 
    fuenteFinanciamiento: 'Ventas de Finca', 
    empleadoNombre: 'Samuel', 
    ayudanteNombre: ''
  });

  const [busquedaDeudor, setBusquedaDeudor] = useState('');
  const [montoAbono, setMontoAbono] = useState('');
  const [deudorSeleccionado, setDeudorSeleccionado] = useState<any>(null);
  const [metodoPagoAbono, setMetodoPagoAbono] = useState('Efectivo');

  useEffect(() => {
    signInAnonymously(auth).catch((e) => console.error("Error Auth:", e));
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!db) return;
    const dailyRecordsRef = collection(db, 'artifacts', appId, 'public', 'data', 'daily_records');
    const unsubscribeDaily = onSnapshot(dailyRecordsRef, (snapshot) => {
      const records: Record<string, any> = {};
      snapshot.forEach(doc => { records[doc.id] = doc.data(); });
      setDbData(records);
    }, (e) => { console.error(e); setLoading(false); });

    const transactionsRef = collection(db, 'artifacts', appId, 'public', 'data', 'transactions');
    const unsubscribeTrans = onSnapshot(transactionsRef, (snapshot) => {
      const transList: any[] = [];
      snapshot.forEach(doc => { transList.push({ id: doc.id, ...doc.data() }); });
      transList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(transList);
      setLoading(false);
    }, (e) => { console.error(e); setLoading(false); });

    // Cargar saldos base iniciales manuales de configuración
    const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'config');
    const unsubscribeConfig = onSnapshot(configRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setBaseInyeccion(Number(data.baseInyeccion || 0));
        setBaseRetorno(Number(data.baseRetorno || 0));
        setInputBaseInyeccion(String(data.baseInyeccion || 0));
        setInputBaseRetorno(String(data.baseRetorno || 0));
      }
    }, (e) => console.error(e));

    return () => { 
      unsubscribeDaily(); 
      unsubscribeTrans(); 
      unsubscribeConfig();
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const showAlert = (title: string, message: string, type = 'success', onConfirm = null) => {
    setAlertConfig({ visible: true, title, message, type, onConfirm });
  };

  const closeAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const guardarEnFirebase = async (datosActualizados: any, fechaDestino = fecha, mostrarMensaje = true) => {
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'daily_records', fechaDestino);
      await setDoc(docRef, datosActualizados, { merge: true });
      if (mostrarMensaje) showToast('💾 Sincronizado con Éxito');
    } catch (e) {
      showToast('❌ Error al guardar datos');
    }
  };

  const guardarSaldosInicialesManuales = async () => {
    try {
      const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'config');
      await setDoc(configRef, {
        baseInyeccion: Number(inputBaseInyeccion),
        baseRetorno: Number(inputBaseRetorno)
      }, { merge: true });
      showToast('💾 Saldos Iniciales Guardados');
    } catch (e) {
      showToast('❌ Error al guardar saldos iniciales');
    }
  };

  const datosDia = dbData[fecha] || DIA_VACIO;

  const handleFincaProduccionChange = (tipo: string, valor: string) => {
    const fincaProduccion = { ...datosDia.fincaProduccion || DIA_VACIO.fincaProduccion, [tipo]: Number(valor) };
    guardarEnFirebase({ ...datosDia, fincaProduccion });
  };

  const handleFincaTransferChange = (tipo: string, valor: string) => {
    const fincaTransfers = { ...datosDia.fincaTransfers || DIA_VACIO.fincaTransfers, [tipo]: Number(valor) };
    guardarEnFirebase({ ...datosDia, fincaTransfers });
  };

  const registrarTransaccionContableAutomatica = async (desc: string, monto: number, tipo: string, cat: string, fuente: string) => {
    if (!db) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'transactions'), {
        type: tipo,
        date: fecha,
        amount: Number(monto),
        description: desc,
        category: cat,
        fuenteFinanciamiento: fuente,
        createdAt: new Date()
      });
    } catch(e) { console.error(e); }
  };

  const agregarVentaFinca = () => {
    if (!nuevaVentaFinca.cliente || !nuevaVentaFinca.cantidad || !nuevaVentaFinca.precioUnitario) return;
    const totalV = Number(nuevaVentaFinca.cantidad) * Number(nuevaVentaFinca.precioUnitario);
    const venta = {
      id: Date.now(), fechaRegistro: fecha, ...nuevaVentaFinca,
      cantidad: Number(nuevaVentaFinca.cantidad), precioUnitario: Number(nuevaVentaFinca.precioUnitario), total: totalV
    };
    guardarEnFirebase({ ...datosDia, fincaVentas: [...datosDia.fincaVentas || [], venta] });
    registrarTransaccionContableAutomatica(`Venta Finca: ${venta.cliente} (${venta.cantidad} ${venta.tipo})`, totalV, 'ingreso', 'Ventas Finca', 'Ventas de Finca');
    setNuevaVentaFinca({ cliente: '', cantidad: '', tipo: 'A', precioUnitario: '', metodoPago: 'Efectivo' });
    showToast('🥚 Venta registrada en Finca');
  };

  const borrarVentaFinca = (id: number) => {
    showAlert("¿Borrar venta de finca?", "Se eliminará el registro contable.", "danger", () => {
      guardarEnFirebase({ ...datosDia, fincaVentas: (datosDia.fincaVentas || []).filter(v => v.id !== id) });
      closeAlert();
    });
  };

  const handleInvInicialChange = (tipo: string, valor: string) => {
    guardarEnFirebase({ ...datosDia, invInicial: { ...datosDia.invInicial, [tipo]: Number(valor) } });
  };

  const handleInvFinalChange = (tipo: string, valor: string) => {
    guardarEnFirebase({ ...datosDia, invFinalFisico: { ...datosDia.invFinalFisico, [tipo]: valor } });
  };

  const agregarVentaDist = () => {
    if (!nuevaVentaDist.cliente || !nuevaVentaDist.cantidad || !nuevaVentaDist.precioUnitario) return;
    const totalV = Number(nuevaVentaDist.cantidad) * Number(nuevaVentaDist.precioUnitario);
    const venta = {
      id: Date.now(), fechaRegistro: fecha, ...nuevaVentaDist,
      cantidad: Number(nuevaVentaDist.cantidad), precioUnitario: Number(nuevaVentaDist.precioUnitario),
      total: totalV, abonado: nuevaVentaDist.pagadoAElla ? totalV : 0
    };
    guardarEnFirebase({ ...datosDia, ventas: [...datosDia.ventas || [], venta] });
    if (venta.pagadoAElla) {
      registrarTransaccionContableAutomatica(`Venta Dist: ${venta.cliente} (${venta.cantidad} ${venta.tipo})`, totalV, 'ingreso', 'Ventas Distribuidora', 'Ventas de Finca');
    }
    setNuevaVentaDist({ ...nuevaVentaDist, cliente: '', cantidad: '', precioUnitario: '' });
    showToast('📦 Venta registrada en Distribuidora');
  };

  const borrarVentaDist = (id: number) => {
    showAlert("¿Eliminar de distribuidora?", "Se borrará de los registros de la distribuidora.", "danger", () => {
      guardarEnFirebase({ ...datosDia, ventas: (datosDia.ventas || []).filter(v => v.id !== id) });
      closeAlert();
    });
  };

  const agregarGastoDist = () => {
    if (!nuevoGastoDist.concepto || !nuevoGastoDist.valor) return;
    const gasto = { id: Date.now(), concepto: nuevoGastoDist.concepto, valor: Number(nuevoGastoDist.valor) };
    guardarEnFirebase({ ...datosDia, gastos: [...datosDia.gastos || [], gasto] });
    registrarTransaccionContableAutomatica(`Gasto Distribuidora: ${gasto.concepto}`, gasto.valor, 'gasto_granja', 'Otros', 'Ventas de Finca');
    setNuevoGastoDist({ concepto: '', valor: '' });
  };

  const borrarGastoDist = (id: number) => {
    showAlert("¿Borrar gasto?", "Se eliminará el gasto operativo.", "danger", () => {
      guardarEnFirebase({ ...datosDia, gastos: (datosDia.gastos || []).filter(g => g.id !== id) });
      closeAlert();
    });
  };

  const realizarCobroDeuda = async () => {
    if (!deudorSeleccionado || !montoAbono) return;
    const valorAbono = Number(montoAbono);
    const fOrig = deudorSeleccionado.fechaOriginal;
    const nuevoCobro = {
      id: Date.now(), cliente: deudorSeleccionado.cliente, valor: valorAbono,
      metodoPago: metodoPagoAbono, refVentaId: deudorSeleccionado.id, nota: `Abono de deuda del ${fOrig}`
    };
    const diaOriginal = dbData[fOrig];
    const ventasActualizadas = diaOriginal.ventas.map((v: any) => v.id === deudorSeleccionado.id ? { ...v, abonado: (v.abonado || 0) + valorAbono } : v);
    
    await Promise.all([
      guardarEnFirebase({ ...datosDia, cobros: [...datosDia.cobros || [], nuevoCobro] }, fecha),
      guardarEnFirebase({ ...diaOriginal, ventas: ventasActualizadas }, fOrig)
    ]);
    
    registrarTransaccionContableAutomatica(`Cobro Cartera: ${deudorSeleccionado.cliente}`, valorAbono, 'ingreso', 'Cartera', 'Ventas de Finca');
    setMontoAbono(''); setDeudorSeleccionado(null);
  };

  const guardarMovimientoFinanciero = async (e: any) => {
    e.preventDefault();
    if (!nuevoMovimientoFinanciero.concepto || !nuevoMovimientoFinanciero.valor) return;

    let descFinal = nuevoMovimientoFinanciero.concepto;
    let catFinal = nuevoMovimientoFinanciero.categoria;

    if (nuevoMovimientoFinanciero.tipo === 'gasto_nomina') {
      catFinal = 'Nómina';
      const n = nuevoMovimientoFinanciero.empleadoNombre === 'Ayudante Extra' ? nuevoMovimientoFinanciero.ayudanteNombre : nuevoMovimientoFinanciero.empleadoNombre;
      descFinal = `Nómina: Pago a ${n} (${nuevoMovimientoFinanciero.concepto})`;
    } else if (nuevoMovimientoFinanciero.tipo === 'inyeccion_socio') {
      catFinal = 'Inyección de Socios';
    } else if (nuevoMovimientoFinanciero.tipo === 'retorno_socio') {
      catFinal = 'Retorno a Socios';
    }

    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'transactions'), {
      type: nuevoMovimientoFinanciero.tipo,
      date: fecha,
      amount: Number(nuevoMovimientoFinanciero.valor),
      description: descFinal,
      category: catFinal,
      fuenteFinanciamiento: (nuevoMovimientoFinanciero.tipo === 'inyeccion_socio' || nuevoMovimientoFinanciero.tipo === 'retorno_socio') ? 'Directo Socios' : nuevoMovimientoFinanciero.fuenteFinanciamiento,
      createdAt: new Date()
    });

    setNuevoMovimientoFinanciero({
      tipo: 'gasto_granja', concepto: '', valor: '', categoria: 'Insumos', fuenteFinanciamiento: 'Ventas de Finca', empleadoNombre: 'Samuel', ayudanteNombre: ''
    });
    showToast('💳 Movimiento contable guardado');
  };

  const borrarMovimientoFinanciero = async (id: string) => {
    showAlert("¿Eliminar transacción?", "Se borrará permanentemente de la contabilidad.", "danger", async () => {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'transactions', id));
        closeAlert();
        showToast('🗑️ Transacción eliminada');
      } catch (e) {
        showToast('❌ Error al eliminar');
      }
    });
  };

  const balancePuntoCero = useMemo(() => {
    let totalInyectado = baseInyeccion; // Se inicia con el saldo base manual
    let totalDevuelto = baseRetorno;   // Se inicia con el saldo base manual

    transactions.forEach(t => {
      if (t.type === 'inyeccion_socio' || t.fuenteFinanciamiento === 'Inyección de Socio') {
        totalInyectado += Number(t.amount || 0);
      }
      if (t.type === 'retorno_socio') {
        totalDevuelto += Number(t.amount || 0);
      }
    });

    return {
      totalInyectado,
      totalDevuelto,
      deudaPendiente: totalInyectado - totalDevuelto,
      porcentajeRetorno: totalInyectado > 0 ? (totalDevuelto / totalInyectado) * 100 : 0
    };
  }, [transactions, baseInyeccion, baseRetorno]);

  const kpisFinancieros = useMemo(() => {
    let ingresosTotales = 0;
    let gastosTotales = 0;

    transactions.forEach(t => {
      if (t.type === 'ingreso') {
        ingresosTotales += Number(t.amount || 0);
      } else if (t.type !== 'inyeccion_socio' && t.type !== 'retorno_socio') {
        gastosTotales += Number(t.amount || 0);
      }
    });

    return { ingresosTotales, gastosTotales, balanceOperacional: ingresosTotales - gastosTotales };
  }, [transactions]);

  const gastosPorCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach(t => {
      if (t.type !== 'ingreso' && t.type !== 'inyeccion_socio' && t.type !== 'retorno_socio') {
        const c = t.category || 'Otros';
        map[c] = (map[c] || 0) + Number(t.amount || 0);
      }
    });
    return Object.keys(map).map(k => ({ name: k, value: map[k] }));
  }, [transactions]);

  const calculosHoy = useMemo(() => {
    const invTeoricoFinca: Record<string, number> = {};
    const invTeoricoDist: Record<string, number> = {};

    TIPOS_HUEVO.forEach(tipo => {
      const prod = Number(datosDia.fincaProduccion?.[tipo] || 0);
      const vFinca = (datosDia.fincaVentas || []).filter((v: any) => v.tipo === tipo).reduce((s: number, v: any) => s + Number(v.cantidad || 0), 0);
      const trans = Number(datosDia.fincaTransfers?.[tipo] || 0);
      invTeoricoFinca[tipo] = prod - vFinca - trans;

      const inicial = Number(datosDia.invInicial?.[tipo] || 0);
      const vDist = (datosDia.ventas || []).filter((v: any) => v.tipo === tipo).reduce((s: number, v: any) => s + Number(v.cantidad || 0), 0);
      invTeoricoDist[tipo] = inicial + trans - vDist;
    });

    const vEfDist = (datosDia.ventas || []).filter((v: any) => v.pagadoAElla && v.metodoPago === 'Efectivo').reduce((s: number, v: any) => s + Number(v.total || 0), 0);
    const vNqDist = (datosDia.ventas || []).filter((v: any) => v.pagadoAElla && v.metodoPago === 'Nequi').reduce((s: number, v: any) => s + Number(v.total || 0), 0);
    const cEfDist = (datosDia.cobros || []).filter((c: any) => c.metodoPago === 'Efectivo').reduce((s: number, v: any) => s + Number(v.valor || 0), 0);
    const cNqDist = (datosDia.cobros || []).filter((c: any) => c.metodoPago === 'Nequi').reduce((s: number, v: any) => s + Number(v.valor || 0), 0);
    const vEfFinca = (datosDia.fincaVentas || []).filter((v: any) => v.metodoPago === 'Efectivo').reduce((s: number, v: any) => s + Number(v.total || 0), 0);
    const vNqFinca = (datosDia.fincaVentas || []).filter((v: any) => v.metodoPago === 'Nequi').reduce((s: number, v: any) => s + Number(v.total || 0), 0);
    const gHoy = (datosDia.gastos || []).reduce((s: number, g: any) => s + Number(g.valor || 0), 0);

    const efectivoEnMano = (vEfDist + cEfDist + vEfFinca) - gHoy;
    const totalNequi = vNqDist + cNqDist + vNqFinca;

    return { invTeoricoFinca, invTeoricoDist, efectivoEnMano, totalNequi, totalConsignar: efectivoEnMano + totalNequi, gastosHoy: gHoy };
  }, [datosDia]);

  const listaDeudores = useMemo(() => {
    let deudores: any[] = [];
    Object.keys(dbData).forEach(fechaKey => {
      const dia = dbData[fechaKey];
      if (dia.ventas) {
        dia.ventas.forEach((venta: any) => {
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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-teal-900 text-white flex-col gap-4">
      <Loader2 className="animate-spin h-12 w-12 text-yellow-400" />
      <p className="font-bold animate-pulse">Sincronizando Libro de Cuentas Huevos Queens...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-2 md:p-6 font-sans text-slate-800">
      
      {/* TOAST NOTIFICACIÓN */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-[110] px-6 py-3 rounded-full shadow-2xl font-bold text-white text-sm bg-teal-900 border border-teal-700 animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* MODAL DE ALERTA PERSONALIZADA */}
      {alertConfig.visible && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[120] p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100">
            <div className="flex items-center gap-3 mb-4 text-amber-500">
              <AlertTriangle size={32} className={alertConfig.type === 'danger' ? 'text-red-500' : 'text-amber-500'} />
              <h3 className="text-lg font-black text-slate-900">{alertConfig.title}</h3>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed mb-6">{alertConfig.message}</p>
            <div className="flex gap-2 justify-end">
              <button onClick={closeAlert} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
              {alertConfig.onConfirm && (
                <button onClick={alertConfig.onConfirm} className={`px-4 py-2 text-white font-bold rounded-xl text-xs shadow-md ${alertConfig.type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-teal-600 hover:bg-teal-700'}`}>Confirmar</button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden min-h-[90vh] border border-slate-100 flex flex-col">
        
        {/* HEADER PRINCIPAL */}
        <div className="bg-teal-800 p-5 text-white shadow-lg sticky top-0 z-[100] border-b-4 border-teal-600">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">Huevos Queens 👑</h1>
              <p className="text-teal-200 text-xs font-semibold flex items-center gap-2 mt-0.5">
                {online ? <span className="flex items-center gap-1"><Wifi size={12} className="text-green-400"/> En Línea</span> : <span className="text-red-300"><WifiOff size={12}/> Desconectado</span>}
              </p>
            </div>
            
            <div className="flex items-center gap-3 bg-teal-900/60 p-2.5 rounded-2xl border border-teal-700 w-full md:w-auto justify-between md:justify-start">
              <span className="text-xs font-bold text-teal-100 uppercase tracking-wider">Fecha de Gestión:</span>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="bg-white text-slate-800 border-none rounded-xl px-3 py-1 font-extrabold focus:ring-2 focus:ring-teal-400 text-sm shadow-inner cursor-pointer" />
            </div>
          </div>

          {/* BARRA DE NAVEGACIÓN */}
          <div className="flex overflow-x-auto gap-1 mt-5 pb-1">
            {[
              { id: 'dashboard', label: 'Inversión & Tablero', icon: <PieChartIcon size={16} /> },
              { id: 'finca', label: 'Finca (Granja)', icon: <Leaf size={16} /> },
              { id: 'distribuidora', label: 'Distribuidora', icon: <Package size={16} /> },
              { id: 'finanzas', label: 'Gastos & Nómina', icon: <Receipt size={16} /> },
              { id: 'historial', label: 'Historial General', icon: <ClipboardList size={16} /> }
            ].map(tab => (
              <button key={tab.id} onClick={() => setVista(tab.id)} className={`py-2 px-4 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${vista === tab.id ? 'bg-white text-teal-900 shadow-md' : 'text-teal-100 hover:bg-teal-700'}`}>{tab.icon}{tab.label}</button>
            ))}
          </div>
        </div>

        {/* --- CONTENIDO DE VISTAS --- */}
        <div className="p-4 md:p-6 flex-1">
          
          {/* VISTA 1: INVERSION Y TABLERO CENTRAL */}
          {vista === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-gradient-to-br from-teal-900 to-emerald-800 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase bg-teal-700/60 text-teal-100 px-3 py-1 rounded-full tracking-widest">CUENTA DE INVERSIÓN CAPITAL DE SOCIO</span>
                    <h2 className="text-3xl font-black mt-3">Balance de Inyección Total</h2>
                    <p className="text-xs text-teal-200 mt-1">Suma acumulada inyectada de tu bolsillo + el saldo histórico manual.</p>
                    <div className="grid grid-cols-2 gap-4 mt-6">
                      <div className="bg-white/10 p-3 rounded-2xl border border-white/5">
                        <span className="text-[10px] text-teal-200 block uppercase font-bold">Inyectado de tu bolsillo</span>
                        <span className="text-xl font-black">${balancePuntoCero.totalInyectado.toLocaleString()}</span>
                      </div>
                      <div className="bg-white/10 p-3 rounded-2xl border border-white/5">
                        <span className="text-[10px] text-teal-200 block uppercase font-bold">Capital Retornado</span>
                        <span className="text-xl font-black text-emerald-300">${balancePuntoCero.totalDevuelto.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">PENDIENTE EN DEUDA DE EMPRESA CONTIGO (PUNTO CERO)</span>
                    <span className="text-4xl font-black tracking-tight text-red-600 block mt-2">-${balancePuntoCero.deudaPendiente.toLocaleString()}</span>
                    <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">Este es el dinero neto que debe retornar el negocio para llegar al Punto Cero de equilibrio.</p>
                  </div>
                </div>
              </div>

              {/* PANEL DE AJUSTE MANUAL INICIAL DE CONTABILIDAD */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                <h3 className="font-black text-slate-900 text-sm mb-2 uppercase tracking-wider flex items-center gap-1.5"><Wallet className="text-teal-700" size={18} /> Ajuste de Saldos Iniciales Históricos (Manual)</h3>
                <p className="text-xs text-slate-500 font-medium mb-4">Ingresa a continuación la base de dinero que ya has invertido históricamente para no perder tus cálculos del pasado. Los nuevos movimientos que registres se sumarán solos sobre estas bases.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-slate-50 p-4 rounded-2xl border">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Inyección de Bolsillo Histórica ($)</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      className="w-full p-2.5 border rounded-xl font-extrabold text-sm" 
                      value={inputBaseInyeccion}
                      onChange={(e) => setInputBaseInyeccion(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Retorno de Capital Histórico ($)</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      className="w-full p-2.5 border rounded-xl font-extrabold text-sm text-emerald-800" 
                      value={inputBaseRetorno}
                      onChange={(e) => setInputBaseRetorno(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={guardarSaldosInicialesManuales} 
                    className="w-full bg-teal-800 hover:bg-teal-900 text-white px-5 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider shadow"
                  >
                    Guardar Saldos Iniciales
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VISTA 2: FINCA (GRANJA) */}
          {vista === 'finca' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 bg-teal-50/50 rounded-3xl p-5 border border-teal-200/50 shadow-sm">
                  <h2 className="font-black text-teal-950 text-sm mb-3 border-b pb-2 flex items-center gap-2"><Sparkles className="text-teal-600" /> Producción Diaria de la Finca ({fecha})</h2>
                  <div className="space-y-2">
                    {TIPOS_HUEVO.map(tipo => (
                      <div key={tipo} className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
                        <span className="font-extrabold text-slate-700 w-24 pl-2 text-xs">{tipo}</span>
                        <input type="number" placeholder="0" className="w-24 p-2 border rounded-xl text-center font-black text-teal-800 text-xs" value={datosDia.fincaProduccion?.[tipo] || ''} onChange={(e) => handleFincaProduccionChange(tipo, e.target.value)} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-7 space-y-6">
                  <div className="bg-amber-50/50 rounded-3xl p-5 border border-amber-200/50 shadow-sm">
                    <h2 className="font-black text-amber-950 text-sm mb-3 border-b pb-2 flex items-center gap-2"><ArrowRight className="text-amber-600" /> Despacho / Envío a la Distribuidora</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {TIPOS_HUEVO.map(tipo => (
                        <div key={tipo} className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center gap-1">
                          <span className="text-[11px] font-extrabold text-slate-600">{tipo}</span>
                          <input type="number" placeholder="0" className="w-20 p-1.5 border rounded-xl text-center font-black text-amber-800 text-xs" value={datosDia.fincaTransfers?.[tipo] || ''} onChange={(e) => handleFincaTransferChange(tipo, e.target.value)} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
                    <h2 className="font-black text-slate-800 mb-4 text-xs border-b pb-2 uppercase tracking-wider">Registrar Venta Directa en la Finca</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <input placeholder="Cliente" className="p-2 border rounded-xl text-xs font-bold" value={nuevaVentaFinca.cliente} onChange={e => setNuevaVentaFinca({...nuevaVentaFinca, cliente: e.target.value})} />
                      <input type="number" placeholder="Cartones" className="p-2 border rounded-xl text-xs font-bold text-center" value={nuevaVentaFinca.cantidad} onChange={e => setNuevaVentaFinca({...nuevaVentaFinca, cantidad: e.target.value})} />
                      <select className="p-2 border rounded-xl text-xs font-bold" value={nuevaVentaFinca.tipo} onChange={e => setNuevaVentaFinca({...nuevaVentaFinca, tipo: e.target.value})}>
                        {TIPOS_HUEVO.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <input type="number" placeholder="$ Unitario" className="p-2 border rounded-xl text-xs font-bold text-center" value={nuevaVentaFinca.precioUnitario} onChange={e => setNuevaVentaFinca({...nuevaVentaFinca, precioUnitario: e.target.value})} />
                    </div>
                    <button onClick={agregarVentaFinca} className="w-full bg-teal-700 hover:bg-teal-800 text-white font-black py-3 rounded-xl text-xs shadow-md">REGISTRAR VENTA EN FINCA</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VISTA 3: DISTRIBUIDORA */}
          {vista === 'distribuidora' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in">
              <div className="lg:col-span-4 bg-teal-50/50 p-5 rounded-3xl border border-teal-200/50 shadow-sm">
                <h2 className="font-black text-teal-950 text-xs uppercase border-b pb-2 mb-3">1. Inventario Inicial Distribuidora</h2>
                <div className="space-y-2">
                  {TIPOS_HUEVO.map(tipo => (
                    <div key={tipo} className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
                      <span className="font-bold text-slate-700 text-xs">{tipo}</span>
                      <input type="number" placeholder="0" className="w-20 p-1.5 border rounded-xl text-center font-bold text-teal-800 text-xs" value={datosDia.invInicial?.[tipo] || ''} onChange={(e) => handleInvInicialChange(tipo, e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-8 space-y-6">
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                  <h2 className="font-black text-slate-800 text-xs uppercase border-b pb-2 mb-4">2. Nueva Venta Distribuidora</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <input placeholder="Cliente" className="p-2 border rounded-xl text-xs font-bold" value={nuevaVentaDist.cliente} onChange={e => setNuevaVentaDist({...nuevaVentaDist, cliente: e.target.value})} />
                    <input type="number" placeholder="Cartones" className="p-2 border rounded-xl text-xs font-bold text-center" value={nuevaVentaDist.cantidad} onChange={e => setNuevaVentaDist({...nuevaVentaDist, cantidad: e.target.value})} />
                    <select className="p-2 border rounded-xl text-xs font-bold" value={nuevaVentaDist.tipo} onChange={e => setNuevaVentaDist({...nuevaVentaDist, tipo: e.target.value})}>
                      {TIPOS_HUEVO.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input type="number" placeholder="$ Unitario" className="p-2 border rounded-xl text-xs font-bold text-center" value={nuevaVentaDist.precioUnitario} onChange={e => setNuevaVentaDist({...nuevaVentaDist, precioUnitario: e.target.value})} />
                  </div>
                  <button onClick={agregarVentaDist} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl text-xs shadow-md">AGREGAR VENTA DISTRIBUIDORA</button>
                </div>
              </div>
            </div>
          )}

          {/* VISTA 4: FINANZAS, FLUX Y NOMINA */}
          {vista === 'finanzas' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in">
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-5 shadow-md">
                <h2 className="font-black text-slate-800 text-sm mb-4 border-b pb-2 flex items-center gap-2"><Receipt /> Flujo Financiero & Nómina</h2>
                <form onSubmit={guardarMovimientoFinanciero} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Tipo de Registro</label>
                    <select className="w-full p-2.5 bg-slate-50 border rounded-2xl text-xs font-bold text-slate-700" value={nuevoMovimientoFinanciero.tipo} onChange={e => setNuevoMovimientoFinanciero({...nuevoMovimientoFinanciero, tipo: e.target.value})}>
                      <option value="gasto_granja">Gasto de la Granja (Alimento, panales, sanidad, etc.)</option>
                      <option value="gasto_nomina">Pago de Nómina (Samuel Papá, Merly, Auxiliares)</option>
                      <option value="inyeccion_socio">Inyección de Capital (Dinero de tu bolsillo ➡️ Suma a Deuda)</option>
                      <option value="retorno_socio">Retorno de Capital (Empresa te paga de vuelta ➡️ Resta Deuda)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Monto ($)</label>
                    <input type="number" placeholder="Monto exacto en pesos" className="w-full p-2.5 border rounded-2xl text-sm font-black outline-none focus:ring-2" value={nuevoMovimientoFinanciero.valor} onChange={e => setNuevoMovimientoFinanciero({...nuevoMovimientoFinanciero, valor: e.target.value})} />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Concepto / Descripción</label>
                    <input placeholder="Ej: Pago quincena Samuel Papá, Compra Purina 40 bultos" className="w-full p-2.5 border rounded-2xl text-xs font-semibold text-slate-700 outline-none focus:ring-2" value={nuevoMovimientoFinanciero.concepto} onChange={e => setNuevoMovimientoFinanciero({...nuevoMovimientoFinanciero, concepto: e.target.value})} />
                  </div>

                  {nuevoMovimientoFinanciero.tipo !== 'inyeccion_socio' && nuevoMovimientoFinanciero.tipo !== 'retorno_socio' && (
                    <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200">
                      <label className="text-[10px] font-black text-amber-950 uppercase block mb-1">Fuente de Financiamiento</label>
                      <select className="w-full p-2 bg-white border rounded-xl text-xs font-bold text-slate-700" value={nuevoMovimientoFinanciero.fuenteFinanciamiento} onChange={e => setNuevoMovimientoFinanciero({...nuevoMovimientoFinanciero, fuenteFinanciamiento: e.target.value})}>
                        <option value="Ventas de Finca">Pagado con Ventas (Dinero producido por los huevos)</option>
                        <option value="Inyección de Socio">Inyectado de otra fuente de ingresos (Dinero puesto por ti)</option>
                      </select>
                    </div>
                  )}

                  <button type="submit" className="w-full bg-teal-800 text-white font-black py-3 rounded-2xl text-xs uppercase shadow-md">REGISTRAR EN CONTABILIDAD</button>
                </form>
              </div>

              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-5 shadow-md flex flex-col justify-between">
                <div className="bg-slate-900 text-white p-5 rounded-3xl border-t-4 border-emerald-500 shadow-xl">
                  <h3 className="font-black text-sm text-yellow-400 border-b pb-2 flex items-center gap-2">Cuadre de Caja Consolidado Unificado</h3>
                  <div className="space-y-2 mt-4 text-xs font-semibold text-slate-300">
                    <div className="flex justify-between"><span>Efectivo Neto en Mano de Hoy:</span><span className="text-white font-black">${calculosHoy.efectivoEnMano.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Consignaciones en Cuenta de Nequi Hoy:</span><span className="text-purple-300 font-black">${calculosHoy.totalNequi.toLocaleString()}</span></div>
                    <div className="flex justify-between text-base font-black text-green-400 border-t pt-2 mt-2"><span>TOTAL CONSOLIDADO A CONSIGNAR:</span><span>${calculosHoy.totalConsignar.toLocaleString()}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VISTA 5: HISTORIAL GENERAL */}
          {vista === 'historial' && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="font-black text-slate-800 text-base">Libro de Transacciones Históricas (Fechas Exactas)</h3>
              <div className="bg-white border rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 text-xs text-slate-600 uppercase">
                    <tr>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Descripción / Concepto</th>
                      <th className="px-4 py-3">Tipo / Categoría</th>
                      <th className="px-4 py-3">Origen Financiero</th>
                      <th className="px-4 py-3 text-right">Valor</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-semibold text-slate-700">
                    {transactions.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-xs text-slate-400 font-bold">{t.date}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{t.description}</td>
                        <td className="px-4 py-3"><span className="bg-slate-100 text-[10px] px-2 py-0.5 rounded-md font-black uppercase">{t.category || t.type}</span></td>
                        <td className="px-4 py-3"><span className="text-[10px] text-slate-500">{t.fuenteFinanciamiento || 'Socio'}</span></td>
                        <td className={`px-4 py-3 text-right font-black ${t.type === 'ingreso' ? 'text-teal-600' : 'text-red-500'}`}>{t.type === 'ingreso' ? '+' : '-'}${Number(t.amount || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => borrarMovimientoFinanciero(t.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}