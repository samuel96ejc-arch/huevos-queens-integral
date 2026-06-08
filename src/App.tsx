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
  PieChart as PieChartIcon, // Evita conflicto con recharts
  ArrowRight,
  Sparkles,
  Award,
  Database,
} from 'lucide-react';
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';

// --- POLYFILL PARA EVITAR CAIDAS DE RECHARTS EN EL NAVEGADOR ---
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = ResizeObserverMock;
}

// Configuración de Firebase Dinámica (priorizando variables de entorno)
const getFirebaseConfig = () => {
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    try {
      return JSON.parse(__firebase_config);
    } catch (e) {
      console.error('Error parsing __firebase_config:', e);
    }
  }
  return {
    apiKey: 'AIzaSyDiWfZPVVDQqH4WB0ec1lfOU4w3BZ6Xrl0',
    authDomain: 'huevos-queens.firebaseapp.com',
    projectId: 'huevos-queens',
    storageBucket: 'huevos-queens.firebasestorage.app',
    messagingSenderId: '131121347509',
    appId: '1:131121347509:web:115811e07073d2c7ccf7fc',
    measurementId: 'G-NHR66VFBZQ',
  };
};

const firebaseConfig = getFirebaseConfig();
let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error('Error al inicializar Firebase:', e);
}

const appId =
  typeof __app_id !== 'undefined' ? __app_id : 'huevos-queens-unified-v3';
const COLORS = [
  '#0f766e',
  '#d97706',
  '#2563eb',
  '#dc2626',
  '#7c3aed',
  '#db2777',
  '#4b5563',
];
const TIPOS_HUEVO = ['Jumbo', 'AAA', 'AA', 'A', 'B', 'C', 'Rotos'];

const DIA_VACIO = {
  fincaProduccion: { Jumbo: 0, AAA: 0, AA: 0, A: 0, B: 0, C: 0, Rotos: 0 },
  fincaVentas: [],
  fincaTransfers: { Jumbo: 0, AAA: 0, AA: 0, A: 0, B: 0, C: 0, Rotos: 0 },
  invInicial: { Jumbo: 0, AAA: 0, AA: 0, A: 0, B: 0, C: 0, Rotos: 0 },
  ventas: [],
  cobros: [],
  gastos: [],
  invFinalFisico: {
    Jumbo: '',
    AAA: '',
    AA: '',
    A: '',
    B: '',
    C: '',
    Rotos: '',
  },
};

export default function App() {
  const [user, setUser] = useState(null);
  const [dbData, setDbData] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [vista, setVista] = useState('dashboard');
  const [online, setOnline] = useState(navigator.onLine);

  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'success',
    onConfirm: null,
  });
  const [toastMessage, setToastMessage] = useState('');

  // Estados de Migración
  const [migrando, setMigrando] = useState(false);
  const [statusMigracion, setStatusMigracion] = useState('');

  const [nuevaVentaDist, setNuevaVentaDist] = useState({
    cliente: '',
    cantidad: '',
    tipo: 'A',
    precioUnitario: '',
    pagadoAElla: true,
    metodoPago: 'Efectivo',
  });
  const [nuevaVentaFinca, setNuevaVentaFinca] = useState({
    cliente: '',
    cantidad: '',
    tipo: 'A',
    precioUnitario: '',
    metodoPago: 'Efectivo',
  });
  const [nuevoGastoDist, setNuevoGastoDist] = useState({
    concepto: '',
    valor: '',
  });

  const [nuevoMovimientoFinanciero, setNuevoMovimientoFinanciero] = useState({
    tipo: 'gasto_granja',
    concepto: '',
    valor: '',
    categoria: 'Insumos',
    fuenteFinanciamiento: 'Ventas de Finca',
    empleadoNombre: 'Samuel',
    ayudanteNombre: '',
  });

  const [busquedaDeudor, setBusquedaDeudor] = useState('');
  const [montoAbono, setMontoAbono] = useState('');
  const [deudorSeleccionado, setDeudorSeleccionado] = useState(null);
  const [metodoPagoAbono, setMetodoPagoAbono] = useState('Efectivo');

  // --- 1. PROCESO DE AUTENTICACIÓN CON FIRESTORE ---
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      showToast('❌ Error: Firebase no configurado.');
      return;
    }

    const initAuth = async () => {
      try {
        if (
          typeof __initial_auth_token !== 'undefined' &&
          __initial_auth_token
        ) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error('Error de Autenticación:', err);
        showToast('⚠️ Modo de visualización local activado.');
        setLoading(false);
      }
    };

    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  // --- 2. SUSCRIPCIONES A FIRESTORE ---
  useEffect(() => {
    if (!user || !db) {
      if (!db) setLoading(false);
      return;
    }

    const dailyRecordsRef = collection(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'daily_records'
    );
    const unsubscribeDaily = onSnapshot(
      dailyRecordsRef,
      (snapshot) => {
        const records = {};
        snapshot.forEach((doc) => {
          records[doc.id] = doc.data();
        });
        setDbData(records);
      },
      (error) => {
        console.error('Error BD:', error);
        setLoading(false);
      }
    );

    const transactionsRef = collection(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'transactions'
    );
    const unsubscribeTrans = onSnapshot(
      transactionsRef,
      (snapshot) => {
        const transList = [];
        snapshot.forEach((doc) => {
          transList.push({ id: doc.id, ...doc.data() });
        });
        transList.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setTransactions(transList);
        setLoading(false);
      },
      (error) => {
        console.error('Error BD Transacciones:', error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeDaily();
      unsubscribeTrans();
    };
  }, [user]);

  // Monitor de conexión de internet
  useEffect(() => {
    const handleStatus = () => setOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  // --- 3. ARRASTRE DE INVENTARIO INICIAL AUTOMÁTICO ---
  useEffect(() => {
    if (loading) return;
    const datosHoy = dbData[fecha];
    const esDiaNuevo =
      !datosHoy ||
      (datosHoy.invInicial &&
        Object.values(datosHoy.invInicial).every((v) => v === 0));

    if (esDiaNuevo) {
      const hoy = new Date(fecha + 'T12:00:00');
      const ayerObj = new Date(hoy);
      ayerObj.setDate(hoy.getDate() - 1);
      const ayer = ayerObj.toISOString().split('T')[0];
      const datosAyer = dbData[ayer];

      if (datosAyer && datosAyer.invFinalFisico) {
        const inventarioHeredado = {};
        let hayDatos = false;

        TIPOS_HUEVO.forEach((tipo) => {
          const valorAyer = Number(datosAyer.invFinalFisico[tipo] || 0);
          inventarioHeredado[tipo] = valorAyer;
          if (valorAyer > 0) hayDatos = true;
        });

        if (hayDatos) {
          guardarEnFirebase(
            {
              ...(datosHoy || DIA_VACIO),
              invInicial: inventarioHeredado,
            },
            fecha,
            false
          );
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

  const closeAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  };

  const guardarEnFirebase = async (
    datosActualizados,
    fechaDestino = fecha,
    mostrarMensaje = true
  ) => {
    try {
      if (!user) {
        showToast('❌ No autenticado');
        return;
      }
      const docRef = doc(
        db,
        'artifacts',
        appId,
        'public',
        'data',
        'daily_records',
        fechaDestino
      );
      await setDoc(docRef, datosActualizados, { merge: true });
      if (mostrarMensaje) {
        showToast('💾 Sincronizado en Nube');
      }
    } catch (e) {
      console.error('Error al guardar en Firebase:', e);
      showToast('❌ Error de red / Reglas de seguridad');
    }
  };

  const datosDia = dbData[fecha] || DIA_VACIO;

  // --- MÓDULO DE MIGRACIÓN DE DATOS (DE LAS DOS APPS VIEJAS) ---
  const ejecutarMigracionGeneral = async () => {
    if (!db) return;
    setMigrando(true);
    setStatusMigracion('Conectando a base de datos anterior...');

    try {
      // 1. Migración de la Distribuidora (registros_diarios_v2)
      setStatusMigracion('Cargando registros antiguos de distribuidora...');
      const oldDailyRef = collection(db, 'registros_diarios_v2');
      const oldDailySnap = await getDocs(oldDailyRef);

      let copiadosDaily = 0;
      for (const documento of oldDailySnap.docs) {
        const dataOld = documento.data();
        const docId = documento.id; // Fecha (ej: 2026-06-07)

        // Adaptar estructura
        const adaptado = {
          invInicial: dataOld.invInicial || DIA_VACIO.invInicial,
          ventas: dataOld.ventas || [],
          cobros: dataOld.cobros || [],
          gastos: dataOld.gastos || [],
          invFinalFisico: dataOld.invFinalFisico || DIA_VACIO.invFinalFisico,
          fincaProduccion: DIA_VACIO.fincaProduccion,
          fincaVentas: [],
          fincaTransfers: DIA_VACIO.fincaTransfers,
        };

        // Guardar en la nueva colección
        const newDocRef = doc(
          db,
          'artifacts',
          appId,
          'public',
          'data',
          'daily_records',
          docId
        );
        await setDoc(newDocRef, adaptado, { merge: true });
        copiadosDaily++;
      }

      // 2. Migración de la Granja (gastos-granja)
      setStatusMigracion('Cargando gastos históricos de granja...');
      const oldExpensesRef = collection(
        db,
        'artifacts',
        'huevos-queens-gastos',
        'public',
        'data',
        'expenses'
      );
      const oldExpensesSnap = await getDocs(oldExpensesRef);

      let copiadosExpenses = 0;
      const transactionsCollectionRef = collection(
        db,
        'artifacts',
        appId,
        'public',
        'data',
        'transactions'
      );

      for (const docExp of oldExpensesSnap.docs) {
        const dataExp = docExp.data();

        // Formatear al nuevo ledger financiero plano sin semanas
        const payload = {
          type: dataExp.type || 'gasto_granja',
          date: dataExp.date || fecha,
          amount: Number(dataExp.amount || 0),
          description: dataExp.description || 'Gasto antiguo migrado',
          category: dataExp.category || 'Otros',
          fuenteFinanciamiento:
            dataExp.type === 'ingreso'
              ? 'Directo Socios'
              : 'Inyección de Socio', // se asume inyección de capital socio
          createdAt: dataExp.createdAt || new Date(),
        };

        await addDoc(transactionsCollectionRef, payload);
        copiadosExpenses++;
      }

      setStatusMigracion(
        `🎉 ¡MIGRACIÓN COMPLETADA! Se mudaron ${copiadosDaily} días de distribuidora y ${copiadosExpenses} transacciones de granja.`
      );
      showToast('🎉 Datos antiguos cargados con éxito.');
    } catch (error) {
      console.error('Error en la migración:', error);
      setStatusMigracion('❌ Error al migrar: Revisa permisos de Firebase.');
    } finally {
      setMigrando(false);
    }
  };

  const handleFincaProduccionChange = (tipo, valor) => {
    const fincaProduccion = {
      ...(datosDia.fincaProduccion || DIA_VACIO.fincaProduccion),
      [tipo]: Number(valor),
    };
    guardarEnFirebase({ ...datosDia, fincaProduccion });
  };

  const handleFincaTransferChange = (tipo, valor) => {
    const canTrans = Number(valor);
    const fincaTransfers = {
      ...(datosDia.fincaTransfers || DIA_VACIO.fincaTransfers),
      [tipo]: canTrans,
    };
    guardarEnFirebase({ ...datosDia, fincaTransfers });
  };

  const registrarIngresoAutomatico = async (descripcion, monto, fDestino) => {
    if (!db) return;
    try {
      const payload = {
        type: 'ingreso',
        date: fDestino,
        amount: Number(monto),
        description: descripcion,
        createdAt: new Date(),
      };
      await addDoc(
        collection(db, 'artifacts', appId, 'public', 'data', 'transactions'),
        payload
      );
    } catch (err) {
      console.error('Error automático de ingreso:', err);
    }
  };

  const agregarVentaFinca = () => {
    if (
      !nuevaVentaFinca.cliente ||
      !nuevaVentaFinca.cantidad ||
      !nuevaVentaFinca.precioUnitario
    ) {
      showToast('⚠️ Completa todos los campos de venta.');
      return;
    }
    const totalVenta =
      Number(nuevaVentaFinca.cantidad) * Number(nuevaVentaFinca.precioUnitario);
    const venta = {
      id: Date.now(),
      fechaRegistro: fecha,
      ...nuevaVentaFinca,
      cantidad: Number(nuevaVentaFinca.cantidad),
      precioUnitario: Number(nuevaVentaFinca.precioUnitario),
      total: totalVenta,
    };

    const fincaVentas = [...(datosDia.fincaVentas || []), venta];
    guardarEnFirebase({ ...datosDia, fincaVentas });

    registrarIngresoAutomatico(
      `Venta en Finca - ${venta.cliente} (${venta.cantidad} de ${venta.tipo})`,
      totalVenta,
      fecha
    );

    setNuevaVentaFinca({
      cliente: '',
      cantidad: '',
      tipo: 'A',
      precioUnitario: '',
      metodoPago: 'Efectivo',
    });
    showToast('🥚 Venta de Finca registrada.');
  };

  const borrarVentaFinca = (id, total) => {
    showAlert(
      'Confirmar Eliminación',
      '¿Seguro que deseas borrar esta venta de Finca?',
      'danger',
      () => {
        const fincaVentas = (datosDia.fincaVentas || []).filter(
          (v) => v.id !== id
        );
        guardarEnFirebase({ ...datosDia, fincaVentas });
        closeAlert();
        showToast('🗑️ Venta eliminada de inventario');
      }
    );
  };

  const handleInvInicialChange = (tipo, valor) => {
    guardarEnFirebase({
      ...datosDia,
      invInicial: { ...datosDia.invInicial, [tipo]: Number(valor) },
    });
  };

  const handleInvFinalChange = (tipo, valor) => {
    guardarEnFirebase({
      ...datosDia,
      invFinalFisico: { ...datosDia.invFinalFisico, [tipo]: valor },
    });
  };

  const agregarVentaDist = () => {
    if (
      !nuevaVentaDist.cliente ||
      !nuevaVentaDist.cantidad ||
      !nuevaVentaDist.precioUnitario
    ) {
      showToast('⚠️ Completa la venta de Distribuidora.');
      return;
    }
    const venta = {
      id: Date.now(),
      fechaRegistro: fecha,
      ...nuevaVentaDist,
      cantidad: Number(nuevaVentaDist.cantidad),
      precioUnitario: Number(nuevaVentaDist.precioUnitario),
      total:
        Number(nuevaVentaDist.cantidad) * Number(nuevaVentaDist.precioUnitario),
      abonado: nuevaVentaDist.pagadoAElla
        ? Number(nuevaVentaDist.cantidad) *
          Number(nuevaVentaDist.precioUnitario)
        : 0,
    };
    guardarEnFirebase({
      ...datosDia,
      ventas: [...(datosDia.ventas || []), venta],
    });

    if (venta.pagadoAElla) {
      registrarIngresoAutomatico(
        `Venta Dist. - ${venta.cliente} (${venta.cantidad} de ${venta.tipo})`,
        venta.total,
        fecha
      );
    }

    setNuevaVentaDist({
      ...nuevaVentaDist,
      cliente: '',
      cantidad: '',
      precioUnitario: '',
    });
    showToast('📦 Venta de distribuidora añadida.');
  };

  const borrarVentaDist = (id) => {
    showAlert(
      '¿Borrar venta?',
      '¿Quieres eliminar este registro de venta?',
      'danger',
      () => {
        guardarEnFirebase({
          ...datosDia,
          ventas: (datosDia.ventas || []).filter((v) => v.id !== id),
        });
        closeAlert();
        showToast('🗑️ Venta eliminada.');
      }
    );
  };

  const registrarGastoAutomatico = async (
    descripcion,
    monto,
    categoria,
    fuente
  ) => {
    if (!db) return;
    try {
      const payload = {
        type: 'gasto_granja',
        date: fecha,
        amount: Number(monto),
        description: descripcion,
        category: categoria,
        fuenteFinanciamiento: fuente,
        createdAt: new Date(),
      };
      await addDoc(
        collection(db, 'artifacts', appId, 'public', 'data', 'transactions'),
        payload
      );
    } catch (err) {
      console.error('Error automático de gasto:', err);
    }
  };

  const agregarGastoDist = () => {
    if (!nuevoGastoDist.concepto || !nuevoGastoDist.valor) return;
    const gasto = {
      id: Date.now(),
      concepto: nuevoGastoDist.concepto,
      valor: Number(nuevoGastoDist.valor),
    };

    guardarEnFirebase({
      ...datosDia,
      gastos: [...(datosDia.gastos || []), gasto],
    });

    registrarGastoAutomatico(
      `Gasto Distribuidora - ${gasto.concepto}`,
      gasto.valor,
      'Otros',
      'Ventas de Finca'
    );

    setNuevoGastoDist({ concepto: '', valor: '' });
    showToast('💸 Gasto operativo de distribuidora guardado.');
  };

  const borrarGastoDist = (id) => {
    showAlert(
      '¿Eliminar Gasto?',
      '¿Quieres quitar este gasto diario?',
      'danger',
      () => {
        guardarEnFirebase({
          ...datosDia,
          gastos: (datosDia.gastos || []).filter((g) => g.id !== id),
        });
        closeAlert();
        showToast('🗑️ Gasto diario eliminado.');
      }
    );
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
      nota: `Abono de deuda del día ${fechaOriginal}`,
    };
    const diaOriginal = dbData[fechaOriginal];
    const ventasActualizadas = diaOriginal.ventas.map((v) =>
      v.id === deudorSeleccionado.id
        ? { ...v, abonado: v.abonado + valorAbono }
        : v
    );

    await Promise.all([
      guardarEnFirebase(
        { ...datosDia, cobros: [...(datosDia.cobros || []), nuevoCobro] },
        fecha
      ),
      guardarEnFirebase(
        { ...diaOriginal, ventas: ventasActualizadas },
        fechaOriginal
      ),
    ]);

    registrarIngresoAutomatico(
      `Abono Cartera - ${deudorSeleccionado.cliente} (Deuda de ${fechaOriginal})`,
      valorAbono,
      fecha
    );

    setMontoAbono('');
    setDeudorSeleccionado(null);
    setMetodoPagoAbono('Efectivo');
    showToast('💰 Abono a deudor registrado.');
  };

  const borrarCobroHoy = (cobro) => {
    showAlert(
      '¿Borrar cobro?',
      'Se revertirá el abono en la deuda del cliente.',
      'danger',
      async () => {
        let fOriginal = null;
        Object.keys(dbData).forEach((fechaKey) => {
          const dia = dbData[fechaKey];
          if (dia.ventas) {
            const ventaIndex = dia.ventas.findIndex(
              (v) => v.id === cobro.refVentaId
            );
            if (ventaIndex !== -1) fOriginal = fechaKey;
          }
        });

        if (fOriginal) {
          const diaOriginal = dbData[fOriginal];
          const ventasRevertidas = diaOriginal.ventas.map((v) =>
            v.id === cobro.refVentaId
              ? { ...v, abonado: Math.max(0, v.abonado - cobro.valor) }
              : v
          );
          await guardarEnFirebase(
            { ...diaOriginal, ventas: ventasRevertidas },
            fOriginal,
            false
          );
        }

        await guardarEnFirebase(
          {
            ...datosDia,
            cobros: (datosDia.cobros || []).filter((c) => c.id !== cobro.id),
          },
          fecha
        );
        closeAlert();
        showToast('🗑️ Abono revertido.');
      }
    );
  };

  const guardarMovimientoFinanciero = async (e) => {
    e.preventDefault();
    if (!db) return;

    if (
      !nuevoMovimientoFinanciero.concepto ||
      !nuevoMovimientoFinanciero.valor
    ) {
      showToast('⚠️ Inserta concepto y monto.');
      return;
    }

    try {
      const isNomina = nuevoMovimientoFinanciero.tipo === 'gasto_nomina';
      const esRetornoSocio = nuevoMovimientoFinanciero.tipo === 'retorno_socio';
      const esInyeccion = nuevoMovimientoFinanciero.tipo === 'inyeccion_socio';

      let descFinal = nuevoMovimientoFinanciero.concepto;
      let catFinal = nuevoMovimientoFinanciero.categoria;

      if (isNomina) {
        catFinal = 'Nómina';
        const emp = nuevoMovimientoFinanciero.empleadoNombre;
        const nombreTrabajador =
          emp === 'Ayudante Extra'
            ? nuevoMovimientoFinanciero.ayudanteNombre
            : emp;
        descFinal = `Nómina: Pago a ${nombreTrabajador} - (${nuevoMovimientoFinanciero.concepto})`;
      } else if (esInyeccion) {
        catFinal = 'Inyección de Socios';
        descFinal = `Inyección de Capital: ${nuevoMovimientoFinanciero.concepto}`;
      } else if (esRetornoSocio) {
        catFinal = 'Retorno a Socios';
        descFinal = `Retorno de Capital a Socio: ${nuevoMovimientoFinanciero.concepto}`;
      }

      const payload = {
        type: nuevoMovimientoFinanciero.tipo,
        date: fecha,
        amount: Number(nuevoMovimientoFinanciero.valor),
        description: descFinal,
        category: catFinal,
        fuenteFinanciamiento:
          esInyeccion || esRetornoSocio
            ? 'Directo Socios'
            : nuevoMovimientoFinanciero.fuenteFinanciamiento,
        createdAt: new Date(),
      };

      await addDoc(
        collection(db, 'artifacts', appId, 'public', 'data', 'transactions'),
        payload
      );

      setNuevoMovimientoFinanciero({
        tipo: 'gasto_granja',
        concepto: '',
        valor: '',
        categoria: 'Insumos',
        fuenteFinanciamiento: 'Ventas de Finca',
        empleadoNombre: 'Samuel',
        ayudanteNombre: '',
      });

      showToast('💳 Transacción Financiera Guardada.');
    } catch (err) {
      console.error('Error guardando flujo financiero:', err);
      showToast('❌ Error al guardar transacción');
    }
  };

  const borrarMovimientoFinanciero = (id) => {
    showAlert(
      '¿Eliminar transacción?',
      'Se borrará permanentemente de la contabilidad.',
      'danger',
      async () => {
        try {
          await deleteDoc(
            doc(db, 'artifacts', appId, 'public', 'data', 'transactions', id)
          );
          closeAlert();
          showToast('🗑️ Transacción borrada.');
        } catch (e) {
          console.error(e);
          showToast('❌ Error al borrar');
        }
      }
    );
  };

  // --- 4. CALCULOS UNIFICADOS DE CAPITAL ---
  const listaDeudores = useMemo(() => {
    let deudores = [];
    Object.keys(dbData).forEach((fechaKey) => {
      const dia = dbData[fechaKey];
      if (dia.ventas) {
        dia.ventas.forEach((venta) => {
          if ((venta.abonado || 0) < (venta.total || 0)) {
            deudores.push({
              ...venta,
              fechaOriginal: fechaKey,
              saldoPendiente:
                Number(venta.total || 0) - Number(venta.abonado || 0),
            });
          }
        });
      }
    });
    return deudores.sort(
      (a, b) =>
        new Date(b.fechaOriginal).getTime() -
        new Date(a.fechaOriginal).getTime()
    );
  }, [dbData]);

  const balancePuntoCero = useMemo(() => {
    let totalInyectado = 0;
    let totalDevuelto = 0;

    transactions.forEach((t) => {
      if (t.type === 'inyeccion_socio') {
        totalInyectado += Number(t.amount || 0);
      }
      if (t.type === 'retorno_socio') {
        totalDevuelto += Number(t.amount || 0);
      }

      if (
        t.type !== 'ingreso' &&
        t.type !== 'inyeccion_socio' &&
        t.type !== 'retorno_socio'
      ) {
        if (t.fuenteFinanciamiento === 'Inyección de Socio') {
          totalInyectado += Number(t.amount || 0);
        }
      }
    });

    const deudaPendiente = totalInyectado - totalDevuelto;
    const porcentajeRetorno =
      totalInyectado > 0 ? (totalDevuelto / totalInyectado) * 100 : 0;

    return {
      totalInyectado,
      totalDevuelto,
      deudaPendiente,
      porcentajeRetorno,
    };
  }, [transactions]);

  const kpisFinancieros = useMemo(() => {
    let ingresosTotales = 0;
    let gastosTotales = 0;

    transactions.forEach((t) => {
      if (t.type === 'ingreso') {
        ingresosTotales += Number(t.amount || 0);
      } else if (t.type !== 'inyeccion_socio' && t.type !== 'retorno_socio') {
        gastosTotales += Number(t.amount || 0);
      }
    });

    return {
      ingresosTotales,
      gastosTotales,
      balanceOperacional: ingresosTotales - gastosTotales,
    };
  }, [transactions]);

  const gastosPorCategoria = useMemo(() => {
    const map = {};
    transactions.forEach((t) => {
      if (
        t.type !== 'ingreso' &&
        t.type !== 'inyeccion_socio' &&
        t.type !== 'retorno_socio'
      ) {
        const cat = t.category || 'Otros';
        map[cat] = (map[cat] || 0) + Number(t.amount || 0);
      }
    });
    return Object.keys(map).map((k) => ({ name: k, value: map[k] }));
  }, [transactions]);

  const calculosHoy = useMemo(() => {
    const invTeoricoFinca = {};
    const invTeoricoDist = {};

    TIPOS_HUEVO.forEach((tipo) => {
      const produccion = Number(datosDia.fincaProduccion?.[tipo] || 0);
      const ventasFinca = (datosDia.fincaVentas || [])
        .filter((v) => v.tipo === tipo)
        .reduce((sum, v) => sum + Number(v.cantidad || 0), 0);
      const transfers = Number(datosDia.fincaTransfers?.[tipo] || 0);

      invTeoricoFinca[tipo] = produccion - ventasFinca - transfers;

      const inicial = Number(datosDia.invInicial?.[tipo] || 0);
      const ventasDist = (datosDia.ventas || [])
        .filter((v) => v.tipo === tipo)
        .reduce((sum, v) => sum + Number(v.cantidad || 0), 0);

      invTeoricoDist[tipo] = inicial + transfers - ventasDist;
    });

    const ventasEfectivoDist = (datosDia.ventas || [])
      .filter((v) => Number(v.abonado || 0) > 0 && v.metodoPago === 'Efectivo')
      .reduce((sum, v) => sum + Number(v.abonado || 0), 0);
    const ventasNequiDist = (datosDia.ventas || [])
      .filter((v) => Number(v.abonado || 0) > 0 && v.metodoPago === 'Nequi')
      .reduce((sum, v) => sum + Number(v.abonado || 0), 0);

    const cobrosEfectivoDist = (datosDia.cobros || [])
      .filter((c) => c.metodoPago === 'Efectivo')
      .reduce((sum, c) => sum + Number(c.valor || 0), 0);
    const cobrosNequiDist = (datosDia.cobros || [])
      .filter((c) => c.metodoPago === 'Nequi')
      .reduce((sum, c) => sum + Number(c.valor || 0), 0);

    const ventasEfectivoFinca = (datosDia.fincaVentas || [])
      .filter((v) => v.metodoPago === 'Efectivo')
      .reduce((sum, v) => sum + Number(v.total || 0), 0);
    const ventasNequiFinca = (datosDia.fincaVentas || [])
      .filter((v) => v.metodoPago === 'Nequi')
      .reduce((sum, v) => sum + Number(v.total || 0), 0);

    const gastosHoy = (datosDia.gastos || []).reduce(
      (sum, g) => sum + Number(g.valor || 0),
      0
    );

    const efectivoEnMano =
      ventasEfectivoDist + cobrosEfectivoDist + ventasEfectivoFinca - gastosHoy;
    const totalNequi = ventasNequiDist + cobrosNequiDist + ventasNequiFinca;
    const totalConsignar = efectivoEnMano + totalNequi;

    return {
      invTeoricoFinca,
      invTeoricoDist,
      efectivoEnMano,
      totalNequi,
      totalConsignar,
      gastosHoy,
    };
  }, [datosDia, dbData]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-teal-50 text-teal-900 flex-col gap-4 font-sans">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-teal-600"></div>
          <Sparkles
            className="absolute inset-0 m-auto text-yellow-500 animate-pulse"
            size={24}
          />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-black tracking-wide">Huevos Queens</h2>
          <p className="text-sm font-bold text-teal-600 animate-pulse mt-1">
            Conectando al Sistema Unificado...
          </p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 p-2 md:p-6 font-sans text-slate-800 selection:bg-teal-200">
      {toastMessage && (
        <div
          className={`fixed bottom-20 left-1/2 transform -translate-x-1/2 z-[110] px-6 py-3 rounded-full shadow-2xl font-bold text-white text-sm transition-all animate-bounce ${
            toastMessage.includes('❌') || toastMessage.includes('⚠️')
              ? 'bg-red-600'
              : 'bg-teal-800'
          }`}
        >
          {toastMessage}
        </div>
      )}

      {alertConfig.visible && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[120] p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4 text-amber-500">
              <AlertTriangle
                size={32}
                className={
                  alertConfig.type === 'danger'
                    ? 'text-red-500'
                    : 'text-amber-500'
                }
              />
              <h3 className="text-lg font-black text-slate-900">
                {alertConfig.title}
              </h3>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed mb-6">
              {alertConfig.message}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={closeAlert}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                Cancelar
              </button>
              {alertConfig.onConfirm && (
                <button
                  onClick={alertConfig.onConfirm}
                  className={`px-4 py-2 text-white font-bold rounded-xl text-xs shadow-md transition-colors ${
                    alertConfig.type === 'danger'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-teal-600 hover:bg-teal-700'
                  }`}
                >
                  Confirmar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden min-h-[90vh] border border-slate-100 flex flex-col">
        <div className="bg-teal-800 p-5 text-white shadow-lg sticky top-0 z-[100] border-b-4 border-teal-600">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10">
                <Leaf className="text-yellow-400 w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                  Huevos Queens{' '}
                  <span className="text-yellow-400 text-lg">👑</span>
                </h1>
                <p className="text-teal-200 text-xs font-semibold flex items-center gap-2 mt-0.5">
                  {online ? (
                    <span className="flex items-center gap-1">
                      <Wifi size={12} className="text-green-400" /> Sistema
                      Online
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-300">
                      <WifiOff size={12} /> Modo Offline
                    </span>
                  )}
                  • <Cloud size={12} className="text-teal-400" /> Sincronizado
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-teal-900/60 p-2.5 rounded-2xl border border-teal-700 w-full md:w-auto justify-between md:justify-start">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-yellow-400" />
                <span className="text-xs font-bold text-teal-100 uppercase tracking-wider">
                  Fecha de Gestión:
                </span>
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
              {
                id: 'dashboard',
                label: 'Inversión & Tablero',
                icon: <PieChartIcon size={16} />,
              },
              {
                id: 'finca',
                label: 'Finca (Granja)',
                icon: <Leaf size={16} />,
              },
              {
                id: 'distribuidora',
                label: 'Distribuidora',
                icon: <Package size={16} />,
              },
              {
                id: 'finanzas',
                label: 'Gastos & Nómina',
                icon: <Receipt size={16} />,
              },
              {
                id: 'historial',
                label: 'Historial',
                icon: <ClipboardList size={16} />,
              },
            ].map((tab) => (
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
          {/* VISTA 1: DASHBOARD DE INVERSION */}
          {vista === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-100 rounded-xl text-amber-800">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-amber-900">
                      Estado de Sostenibilidad
                    </h3>
                    <p className="text-xs text-amber-700 font-medium">
                      La granja produce ingresos, pero aún requiere inyecciones
                      periódicas (50% de producción actual).
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
                    Etapa de Crecimiento
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-gradient-to-br from-teal-900 to-emerald-800 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute right-0 bottom-0 translate-y-10 translate-x-10 opacity-10">
                    <Award size={200} />
                  </div>

                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-black uppercase bg-teal-700/60 text-teal-100 px-3 py-1 rounded-full tracking-widest">
                          PROGRESO HACIA PUNTO CERO
                        </span>
                        <h2 className="text-3xl font-black tracking-tight mt-3">
                          Cuenta de Inversión
                        </h2>
                        <p className="text-xs text-teal-200 font-medium mt-1">
                          Suma acumulada que el negocio debe reintegrar a los
                          socios.
                        </p>
                      </div>
                      <Wallet size={36} className="text-yellow-400" />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-8">
                      <div className="bg-white/10 p-3 rounded-2xl border border-white/5">
                        <span className="text-[10px] text-teal-200 font-bold uppercase tracking-wider block">
                          Capital Inyectado (Deuda)
                        </span>
                        <span className="text-xl font-black text-white">
                          ${balancePuntoCero.totalInyectado.toLocaleString()}
                        </span>
                      </div>
                      <div className="bg-white/10 p-3 rounded-2xl border border-white/5">
                        <span className="text-[10px] text-teal-200 font-bold uppercase tracking-wider block">
                          Capital Retornado
                        </span>
                        <span className="text-xl font-black text-emerald-300">
                          ${balancePuntoCero.totalDevuelto.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-teal-700/60">
                    <div className="flex justify-between text-xs font-bold text-teal-200 mb-2">
                      <span>Retornado al Socio</span>
                      <span>
                        {balancePuntoCero.porcentajeRetorno.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-teal-950/60 rounded-full h-3 overflow-hidden p-0.5 border border-teal-700/40">
                      <div
                        className="bg-gradient-to-r from-yellow-400 to-green-400 h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            100,
                            balancePuntoCero.porcentajeRetorno
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md flex flex-col justify-between">
                  <div className="text-center lg:text-left">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">
                      PENDIENTE POR RECUPERAR
                    </span>
                    <span className="text-4xl font-black tracking-tight text-red-600 block mt-2">
                      -${balancePuntoCero.deudaPendiente.toLocaleString()}
                    </span>
                    <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">
                      Este es el monto exacto que te debe pagar la empresa para
                      llegar a equilibrio de inversión.
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-4 mt-4 border border-slate-100 flex items-center gap-3">
                    <TrendingUp className="text-teal-600" size={20} />
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase block">
                        Balance Operativo Global
                      </span>
                      <span
                        className={`text-base font-bold ${
                          kpisFinancieros.balanceOperacional >= 0
                            ? 'text-teal-700'
                            : 'text-red-500'
                        }`}
                      >
                        {kpisFinancieros.balanceOperacional < 0 ? '-' : ''}$
                        {Math.abs(
                          kpisFinancieros.balanceOperacional
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* MÓDULO INTELIGENTE DE MIGRACIÓN */}
              <div className="bg-teal-50 border border-teal-200 rounded-3xl p-6 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3.5 bg-teal-100 rounded-2xl text-teal-800">
                      <Database size={28} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-teal-950 text-base flex items-center gap-2">
                        ¿Deseas migrar tus datos antiguos de Huevos Queens?
                      </h3>
                      <p className="text-xs text-teal-700 font-semibold max-w-xl mt-1 leading-relaxed">
                        Si haces clic abajo, el sistema copiará automáticamente
                        todas las ventas del historial viejo
                        (`registros_diarios_v2`) y los gastos e ingresos de la
                        granja (`expenses`) al nuevo sistema integral unificado
                        sin que pierdas nada.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={ejecutarMigracionGeneral}
                    disabled={migrando}
                    className="bg-teal-800 hover:bg-teal-900 disabled:bg-teal-600 text-white font-black py-3 px-6 rounded-2xl text-xs shadow-md tracking-wider flex items-center gap-2 transition-transform active:scale-95"
                  >
                    {migrando ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <RefreshCw size={16} />
                    )}
                    INICIAR MIGRACIÓN DE DATOS
                  </button>
                </div>

                {statusMigracion && (
                  <div className="bg-white p-3 rounded-xl border border-teal-200 mt-4 text-xs font-bold text-teal-900 tracking-wide">
                    ⏳ Estado del proceso: {statusMigracion}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-3xl border border-slate-100 shadow-md p-5">
                  <h3 className="font-bold text-slate-700 text-sm mb-4 flex items-center gap-2">
                    <PieChartIcon size={16} className="text-teal-600" />{' '}
                    Distribución de Gastos por Categoría
                  </h3>
                  <div className="h-64 w-full">
                    {gastosPorCategoria.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                          <Pie
                            data={gastosPorCategoria}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {gastosPorCategoria.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => '$' + value.toLocaleString()}
                          />
                          <Legend
                            wrapperStyle={{
                              fontSize: '11px',
                              fontWeight: 'bold',
                            }}
                          />
                        </RePieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                        Sin datos de gastos aún (presiona el botón de migración
                        arriba)
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 shadow-md p-5 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-slate-700 text-sm mb-4">
                      Métricas Financieras del Proyecto
                    </h3>
                    <div className="space-y-4 mt-6">
                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="text-xs font-semibold text-slate-500">
                          Total Ingresos Totales (Finca+Dist):
                        </span>
                        <span className="font-extrabold text-teal-700">
                          ${kpisFinancieros.ingresosTotales.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="text-xs font-semibold text-slate-500">
                          Total Egresos (Insumos/Personal/Etc):
                        </span>
                        <span className="font-extrabold text-red-500">
                          ${kpisFinancieros.gastosTotales.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="text-xs font-semibold text-slate-500">
                          Aportes Inyectados del Bolsillo del Socio:
                        </span>
                        <span className="font-extrabold text-slate-700">
                          ${balancePuntoCero.totalInyectado.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-teal-50 p-4 rounded-2xl border border-teal-100 mt-4 text-center">
                    <p className="text-xs text-teal-800 font-bold">
                      🎯 Objetivo Actual
                    </p>
                    <p className="text-xs text-teal-600 font-medium mt-1">
                      Incrementar la producción del 50% al 100% para lograr el
                      punto de autogestión completa.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VISTA 2: FINCA (GRANJA) */}
          {vista === 'finca' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 bg-teal-50/50 rounded-3xl p-5 border border-teal-200/50 shadow-sm">
                  <div className="flex items-center gap-2 border-b border-teal-100 pb-3 mb-4">
                    <Sparkles className="text-teal-600" />
                    <div>
                      <h2 className="font-black text-teal-950 text-base">
                        Producción Diaria de Finca
                      </h2>
                      <p className="text-[10px] text-teal-600 font-bold uppercase tracking-wider">
                        Huevos Recolectados Hoy ({fecha})
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {TIPOS_HUEVO.map((tipo) => (
                      <div
                        key={tipo}
                        className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-100 shadow-sm hover:border-teal-300 transition-colors"
                      >
                        <span className="font-extrabold text-slate-700 w-24 pl-2 text-sm">
                          {tipo}
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            placeholder="0"
                            className="w-24 p-2 border border-slate-200 rounded-xl text-center font-black text-teal-800 focus:ring-2 focus:ring-teal-400 outline-none text-sm"
                            value={datosDia.fincaProduccion?.[tipo] || ''}
                            onChange={(e) =>
                              handleFincaProduccionChange(tipo, e.target.value)
                            }
                          />
                          <span className="text-xs font-bold text-slate-400">
                            Cartones
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-7 space-y-6">
                  <div className="bg-amber-50/50 rounded-3xl p-5 border border-amber-200/50 shadow-sm">
                    <div className="flex items-center gap-2 border-b border-amber-100 pb-3 mb-4">
                      <ArrowRight className="text-amber-600" />
                      <div>
                        <h2 className="font-black text-amber-950 text-base">
                          Despacho a Distribuidora
                        </h2>
                        <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">
                          Cajas Trasladadas para la venta en Distribuidora
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {TIPOS_HUEVO.map((tipo) => (
                        <div
                          key={tipo}
                          className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1 items-center"
                        >
                          <span className="text-xs font-extrabold text-slate-600">
                            {tipo}
                          </span>
                          <input
                            type="number"
                            placeholder="0"
                            className="w-full p-2 border border-slate-200 rounded-xl text-center font-black text-amber-800 focus:ring-2 focus:ring-amber-400 outline-none text-sm"
                            value={datosDia.fincaTransfers?.[tipo] || ''}
                            onChange={(e) =>
                              handleFincaTransferChange(tipo, e.target.value)
                            }
                          />
                          <span className="text-[9px] font-bold text-slate-400">
                            Transferido
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-amber-600 mt-3 text-center font-bold italic">
                      * Estas cantidades sumarán automáticamente al inventario
                      de la distribuidora hoy.
                    </p>
                  </div>

                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
                    <h2 className="font-black text-slate-800 mb-4 flex items-center gap-2 text-base border-b pb-2">
                      <Calculator className="h-5 w-5 text-teal-600" /> Registrar
                      Venta Directa de Finca
                    </h2>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Cliente
                        </label>
                        <input
                          placeholder="Nombre"
                          className="w-full p-2 border rounded-xl focus:ring-2 focus:ring-teal-400 outline-none text-xs font-semibold"
                          value={nuevaVentaFinca.cliente}
                          onChange={(e) =>
                            setNuevaVentaFinca({
                              ...nuevaVentaFinca,
                              cliente: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Cant. Cartones
                        </label>
                        <input
                          type="number"
                          placeholder="#"
                          className="w-full p-2 border rounded-xl focus:ring-2 focus:ring-teal-400 outline-none text-xs font-semibold text-center"
                          value={nuevaVentaFinca.cantidad}
                          onChange={(e) =>
                            setNuevaVentaFinca({
                              ...nuevaVentaFinca,
                              cantidad: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Tipo Huevo
                        </label>
                        <select
                          className="w-full p-2 border rounded-xl bg-white focus:ring-2 focus:ring-teal-400 outline-none text-xs font-bold text-slate-700"
                          value={nuevaVentaFinca.tipo}
                          onChange={(e) =>
                            setNuevaVentaFinca({
                              ...nuevaVentaFinca,
                              tipo: e.target.value,
                            })
                          }
                        >
                          {TIPOS_HUEVO.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Precio Unitario
                        </label>
                        <input
                          type="number"
                          placeholder="$ Valor"
                          className="w-full p-2 border rounded-xl focus:ring-2 focus:ring-teal-400 outline-none text-xs font-semibold text-center"
                          value={nuevaVentaFinca.precioUnitario}
                          onChange={(e) =>
                            setNuevaVentaFinca({
                              ...nuevaVentaFinca,
                              precioUnitario: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="flex gap-4 items-center mb-4">
                      <span className="text-xs font-bold text-slate-500">
                        Método de pago:
                      </span>
                      <label className="flex items-center gap-1.5 text-xs font-extrabold text-slate-600 cursor-pointer">
                        <input
                          type="radio"
                          name="pagoFinca"
                          checked={nuevaVentaFinca.metodoPago === 'Efectivo'}
                          onChange={() =>
                            setNuevaVentaFinca({
                              ...nuevaVentaFinca,
                              metodoPago: 'Efectivo',
                            })
                          }
                        />
                        Efectivo
                      </label>
                      <label className="flex items-center gap-1.5 text-xs font-extrabold text-slate-600 cursor-pointer">
                        <input
                          type="radio"
                          name="pagoFinca"
                          checked={nuevaVentaFinca.metodoPago === 'Nequi'}
                          onChange={() =>
                            setNuevaVentaFinca({
                              ...nuevaVentaFinca,
                              metodoPago: 'Nequi',
                            })
                          }
                        />
                        Nequi
                      </label>
                    </div>

                    <button
                      onClick={agregarVentaFinca}
                      className="w-full bg-teal-700 hover:bg-teal-800 text-white font-extrabold py-3.5 rounded-2xl shadow-lg flex items-center justify-center gap-2 text-sm transition-transform active:scale-95"
                    >
                      <PlusCircle size={18} /> Registrar Venta en Finca
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-extrabold text-slate-800 text-sm">
                    Registro de Ventas en Finca ({fecha})
                  </h3>
                  <span className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-full font-black">
                    Total Finca Hoy: $
                    {(datosDia.fincaVentas || [])
                      .reduce((s, v) => s + Number(v.total || 0), 0)
                      .toLocaleString()}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-600 uppercase bg-slate-100 border-b">
                      <tr>
                        <th className="px-4 py-3">Cliente</th>
                        <th className="px-4 py-3 text-center">
                          Cant. Cartones
                        </th>
                        <th className="px-4 py-3 text-center">Tipo Huevo</th>
                        <th className="px-4 py-3 text-right">
                          Precio Unitario
                        </th>
                        <th className="px-4 py-3 text-right">Total</th>
                        <th className="px-4 py-3 text-center">Pago</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(datosDia.fincaVentas || []).map((v) => (
                        <tr
                          key={v.id}
                          className="border-b hover:bg-slate-50 font-semibold text-slate-700"
                        >
                          <td className="px-4 py-3 font-bold">{v.cliente}</td>
                          <td className="px-4 py-3 text-center">
                            {v.cantidad}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="bg-teal-50 text-teal-800 px-2 py-0.5 rounded-lg text-xs">
                              {v.tipo}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            ${v.precioUnitario.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-slate-900">
                            ${v.total.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${
                                v.metodoPago === 'Nequi'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {v.metodoPago}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => borrarVentaFinca(v.id, v.total)}
                              className="text-slate-300 hover:text-red-500 p-1"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {(datosDia.fincaVentas || []).length === 0 && (
                        <tr>
                          <td
                            colSpan="7"
                            className="text-center py-8 text-slate-400 italic font-semibold"
                          >
                            No se han registrado ventas en finca hoy.
                          </td>
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
                <div className="bg-teal-50/50 p-5 rounded-3xl border border-teal-200/50 shadow-sm">
                  <h2 className="font-black text-teal-950 mb-3 flex items-center gap-2 border-b border-teal-200/60 pb-2 text-sm">
                    <Package className="h-5 w-5 text-teal-700" /> 1. Stock
                    Inicial Distribuidora
                  </h2>
                  <div className="space-y-2">
                    {TIPOS_HUEVO.map((tipo) => (
                      <div
                        key={tipo}
                        className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-100 shadow-sm"
                      >
                        <span className="font-bold text-slate-700 w-16 pl-2 text-xs">
                          {tipo}
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            placeholder="0"
                            className="w-20 p-1.5 border border-slate-200 rounded-xl text-center font-bold text-teal-800 focus:ring-2 focus:ring-teal-400 outline-none text-xs"
                            value={datosDia.invInicial?.[tipo] || ''}
                            onChange={(e) =>
                              handleInvInicialChange(tipo, e.target.value)
                            }
                          />
                          <span className="text-[10px] font-bold text-slate-400">
                            Restante
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-teal-600 mt-2 text-center font-bold italic">
                    * Hereda automáticamente el excedente de ayer.
                  </p>
                </div>

                <div className="bg-blue-50/50 p-5 rounded-3xl border border-blue-200/50 shadow-sm">
                  <h2 className="font-black text-blue-950 mb-3 flex items-center gap-2 border-b border-blue-200/60 pb-2 text-sm">
                    <Users className="h-5 w-5 text-blue-700" /> Cartera de
                    Clientes (Distribuidora)
                  </h2>

                  <div className="relative mb-3">
                    <Search
                      className="absolute left-3 top-2 text-blue-400"
                      size={16}
                    />
                    <input
                      type="text"
                      placeholder="Buscar deudor..."
                      className="w-full pl-9 p-2 rounded-xl border border-blue-200 shadow-inner focus:ring-2 focus:ring-blue-400 outline-none text-xs font-bold text-slate-700"
                      value={busquedaDeudor}
                      onChange={(e) => setBusquedaDeudor(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {listaDeudores
                      .filter((d) =>
                        d.cliente
                          .toLowerCase()
                          .includes(busquedaDeudor.toLowerCase())
                      )
                      .map((item) => (
                        <div
                          key={item.id}
                          className="bg-white p-3 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden"
                        >
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-red-400"></div>
                          <div className="flex flex-col gap-1 pl-1">
                            <h4 className="font-extrabold text-xs text-slate-800">
                              {item.cliente}
                            </h4>
                            <span className="text-[10px] text-slate-400 font-bold">
                              {item.fechaOriginal} • {item.cantidad} de{' '}
                              {item.tipo}
                            </span>
                            <span className="text-red-600 font-extrabold text-xs bg-red-50 py-0.5 px-2 rounded-lg w-max mt-1">
                              Debe: ${item.saldoPendiente.toLocaleString()}
                            </span>

                            {deudorSeleccionado?.id === item.id ? (
                              <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-2">
                                <input
                                  type="number"
                                  className="w-full p-2 border rounded-xl text-center font-bold text-xs"
                                  placeholder="$ Monto Abono"
                                  value={montoAbono}
                                  onChange={(e) =>
                                    setMontoAbono(e.target.value)
                                  }
                                />
                                <div className="flex gap-1 justify-center bg-slate-50 p-1 rounded-xl">
                                  <button
                                    onClick={() =>
                                      setMetodoPagoAbono('Efectivo')
                                    }
                                    className={`px-2 py-1 rounded-lg text-[10px] font-black ${
                                      metodoPagoAbono === 'Efectivo'
                                        ? 'bg-teal-600 text-white'
                                        : 'text-slate-500'
                                    }`}
                                  >
                                    EF
                                  </button>
                                  <button
                                    onClick={() => setMetodoPagoAbono('Nequi')}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-black ${
                                      metodoPagoAbono === 'Nequi'
                                        ? 'bg-purple-600 text-white'
                                        : 'text-slate-500'
                                    }`}
                                  >
                                    NEQUI
                                  </button>
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    onClick={realizarCobroDeuda}
                                    className="bg-teal-600 text-white px-3 py-1.5 rounded-xl font-bold text-[10px] hover:bg-teal-700 flex-1"
                                  >
                                    Abonar
                                  </button>
                                  <button
                                    onClick={() => setDeudorSeleccionado(null)}
                                    className="bg-slate-200 text-slate-600 px-2 py-1.5 rounded-xl font-bold text-[10px]"
                                  >
                                    X
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setDeudorSeleccionado(item);
                                  setMontoAbono(item.saldoPendiente);
                                }}
                                className="bg-blue-600 text-white px-3 py-1 rounded-xl font-bold text-[10px] hover:bg-blue-700 mt-2 w-max shadow-sm"
                              >
                                Pagar Abono
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    {listaDeudores.length === 0 && (
                      <p className="text-center text-[11px] text-slate-400 font-bold py-4">
                        No hay deudas por cobrar.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-8 space-y-6">
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                  <h2 className="font-black text-slate-800 mb-4 flex items-center gap-2 text-sm border-b pb-2">
                    <Calculator className="h-5 w-5 text-emerald-600" /> 2. Nueva
                    Venta Distribuidora
                  </h2>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 items-end mb-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase">
                        Cliente
                      </label>
                      <input
                        placeholder="Nombre"
                        className="w-full p-2 border rounded-xl focus:ring-2 focus:ring-teal-400 outline-none text-xs font-bold"
                        value={nuevaVentaDist.cliente}
                        onChange={(e) =>
                          setNuevaVentaDist({
                            ...nuevaVentaDist,
                            cliente: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase">
                        Cant. Cartones
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        className="w-full p-2 border rounded-xl focus:ring-2 focus:ring-teal-400 outline-none text-xs text-center font-bold"
                        value={nuevaVentaDist.cantidad}
                        onChange={(e) =>
                          setNuevaVentaDist({
                            ...nuevaVentaDist,
                            cantidad: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase">
                        Tipo
                      </label>
                      <select
                        className="w-full p-2 border rounded-xl bg-white focus:ring-2 focus:ring-teal-400 outline-none text-xs font-bold"
                        value={nuevaVentaDist.tipo}
                        onChange={(e) =>
                          setNuevaVentaDist({
                            ...nuevaVentaDist,
                            tipo: e.target.value,
                          })
                        }
                      >
                        {TIPOS_HUEVO.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase">
                        Precio Carton ($)
                      </label>
                      <input
                        type="number"
                        placeholder="$"
                        className="w-full p-2 border rounded-xl focus:ring-2 focus:ring-teal-400 outline-none text-xs text-center font-bold"
                        value={nuevaVentaDist.precioUnitario}
                        onChange={(e) =>
                          setNuevaVentaDist({
                            ...nuevaVentaDist,
                            precioUnitario: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="col-span-2 pt-2 border-t mt-2 grid grid-cols-2 gap-2">
                      <div
                        onClick={() =>
                          setNuevaVentaDist({
                            ...nuevaVentaDist,
                            pagadoAElla: true,
                          })
                        }
                        className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-colors ${
                          nuevaVentaDist.pagadoAElla
                            ? 'bg-teal-50 border-teal-300'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <CheckCircle
                          size={16}
                          className={
                            nuevaVentaDist.pagadoAElla
                              ? 'text-teal-600'
                              : 'text-slate-300'
                          }
                        />
                        <span className="text-[11px] font-black text-slate-700">
                          Pagado
                        </span>
                      </div>
                      <div
                        onClick={() =>
                          setNuevaVentaDist({
                            ...nuevaVentaDist,
                            pagadoAElla: false,
                          })
                        }
                        className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-colors ${
                          !nuevaVentaDist.pagadoAElla
                            ? 'bg-red-50 border-red-300'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <CheckCircle
                          size={16}
                          className={
                            !nuevaVentaDist.pagadoAElla
                              ? 'text-red-600'
                              : 'text-slate-300'
                          }
                        />
                        <span className="text-[11px] font-black text-slate-700">
                          Debe
                        </span>
                      </div>
                    </div>

                    {nuevaVentaDist.pagadoAElla && (
                      <div className="col-span-2 flex gap-4 justify-center items-center h-10 mt-2 border-t">
                        <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 cursor-pointer">
                          <input
                            type="radio"
                            checked={nuevaVentaDist.metodoPago === 'Efectivo'}
                            onChange={() =>
                              setNuevaVentaDist({
                                ...nuevaVentaDist,
                                metodoPago: 'Efectivo',
                              })
                            }
                          />{' '}
                          Efectivo
                        </label>
                        <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 cursor-pointer">
                          <input
                            type="radio"
                            checked={nuevaVentaDist.metodoPago === 'Nequi'}
                            onChange={() =>
                              setNuevaVentaDist({
                                ...nuevaVentaDist,
                                metodoPago: 'Nequi',
                              })
                            }
                          />{' '}
                          Nequi
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
                    <h3 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">
                      Ventas Distribuidora de hoy ({fecha})
                    </h3>
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
                        {(datosDia.ventas || []).map((v) => (
                          <tr
                            key={v.id}
                            className="border-b font-semibold text-slate-700"
                          >
                            <td className="px-4 py-3 font-bold">{v.cliente}</td>
                            <td className="px-4 py-3 text-center">
                              {v.cantidad}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                                {v.tipo}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-slate-900">
                              ${v.total.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {Number(v.abonado || 0) >=
                              Number(v.total || 0) ? (
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                                    v.metodoPago === 'Nequi'
                                      ? 'bg-purple-100 text-purple-700'
                                      : 'bg-green-100 text-green-700'
                                  }`}
                                >
                                  {v.metodoPago}
                                </span>
                              ) : (
                                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[9px] font-black">
                                  DEUDOR
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => borrarVentaDist(v.id)}
                                className="text-slate-300 hover:text-red-500"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {(datosDia.ventas || []).length === 0 && (
                          <tr>
                            <td
                              colSpan="6"
                              className="text-center py-6 text-slate-400 italic"
                            >
                              No hay ventas registradas.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-slate-800 text-white rounded-3xl p-5 shadow-lg border-t-4 border-yellow-500">
                  <h3 className="font-bold text-sm text-yellow-400 mb-3 flex items-center gap-2">
                    <CheckCircle size={18} /> Balance Físico de Huevos (Finca vs
                    Distribuidora)
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-700">
                          <th className="text-left pb-2">Tipo de Huevo</th>
                          <th className="text-center pb-2">
                            Fórmula Teórica (Finca)
                          </th>
                          <th className="text-center pb-2">
                            Teórico (Distribuidora)
                          </th>
                          <th className="text-center pb-2 text-yellow-400">
                            Físico Distribuidora (Real)
                          </th>
                          <th className="text-center pb-2">Dif.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {TIPOS_HUEVO.map((tipo) => {
                          const teoricoFinca =
                            calculosHoy.invTeoricoFinca[tipo];
                          const teoricoDist = calculosHoy.invTeoricoDist[tipo];

                          if (
                            teoricoFinca === 0 &&
                            teoricoDist === 0 &&
                            !datosDia.invFinalFisico?.[tipo]
                          )
                            return null;

                          const fisicoReal = Number(
                            datosDia.invFinalFisico?.[tipo] || 0
                          );
                          const diff = fisicoReal - teoricoDist;

                          return (
                            <tr
                              key={tipo}
                              className="border-b border-slate-700/50"
                            >
                              <td className="py-2 font-bold text-slate-200">
                                {tipo}
                              </td>
                              <td className="py-2 text-center text-teal-300 font-semibold">
                                {teoricoFinca} cartones
                              </td>
                              <td className="py-2 text-center text-slate-300 font-semibold">
                                {teoricoDist} cartones
                              </td>
                              <td className="py-2 text-center">
                                <input
                                  type="number"
                                  className="w-14 bg-slate-950 border border-slate-600 text-center rounded-xl p-1 text-yellow-400 font-black text-xs outline-none"
                                  placeholder="0"
                                  value={datosDia.invFinalFisico?.[tipo] || ''}
                                  onChange={(e) =>
                                    handleInvFinalChange(tipo, e.target.value)
                                  }
                                />
                              </td>
                              <td
                                className={`py-2 text-center font-black ${
                                  diff < 0
                                    ? 'text-red-400'
                                    : diff > 0
                                    ? 'text-emerald-400'
                                    : 'text-slate-400'
                                }`}
                              >
                                {fisicoReal > 0
                                  ? diff === 0
                                    ? 'OK'
                                    : diff
                                  : '-'}
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
                  <Receipt className="text-teal-700" /> Registro de Movimientos
                  Financieros
                </h2>

                <form
                  onSubmit={guardarMovimientoFinanciero}
                  className="space-y-4"
                >
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">
                      Tipo de Movimiento
                    </label>
                    <select
                      className="w-full p-2.5 bg-slate-50 border rounded-2xl text-xs font-bold text-slate-700"
                      value={nuevoMovimientoFinanciero.tipo}
                      onChange={(e) =>
                        setNuevoMovimientoFinanciero({
                          ...nuevoMovimientoFinanciero,
                          tipo: e.target.value,
                        })
                      }
                    >
                      <option value="gasto_granja">
                        Gasto de la Granja (Insumos/Servicios)
                      </option>
                      <option value="gasto_nomina">
                        Pago de Nómina (Samuel/Merly/Extras)
                      </option>
                      <option value="inyeccion_socio">
                        Inyección de Capital de Socio (Tu bolsillo ➡️ Deuda)
                      </option>
                      <option value="retorno_socio">
                        Retorno de Capital a Socio (Negocio paga a Socio ➡️
                        Restar)
                      </option>
                    </select>
                  </div>

                  {nuevoMovimientoFinanciero.tipo === 'gasto_nomina' && (
                    <div className="bg-teal-50 p-3 rounded-2xl space-y-3 border border-teal-100">
                      <div>
                        <label className="text-[10px] font-black text-teal-800 uppercase block mb-1">
                          Personal
                        </label>
                        <select
                          className="w-full p-2 bg-white border rounded-xl text-xs font-bold text-slate-700"
                          value={nuevoMovimientoFinanciero.empleadoNombre}
                          onChange={(e) =>
                            setNuevoMovimientoFinanciero({
                              ...nuevoMovimientoFinanciero,
                              empleadoNombre: e.target.value,
                            })
                          }
                        >
                          <option value="Samuel">
                            Samuel (Maneja la Granja - Fijo)
                          </option>
                          <option value="Merly">
                            Merly (Distribuidora - Fijo)
                          </option>
                          <option value="Ayudante Extra">
                            Ayudante Extra (Temporal)
                          </option>
                        </select>
                      </div>

                      {nuevoMovimientoFinanciero.empleadoNombre ===
                        'Ayudante Extra' && (
                        <div>
                          <label className="text-[10px] font-black text-teal-800 uppercase block mb-1">
                            Nombre del Asistente
                          </label>
                          <input
                            placeholder="Ej: Pedro Pérez"
                            className="w-full p-2 bg-white border rounded-xl text-xs font-semibold"
                            value={nuevoMovimientoFinanciero.ayudanteNombre}
                            onChange={(e) =>
                              setNuevoMovimientoFinanciero({
                                ...nuevoMovimientoFinanciero,
                                ayudanteNombre: e.target.value,
                              })
                            }
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">
                      Monto ($)
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      className="w-full p-2.5 border rounded-2xl text-sm font-black text-slate-800 outline-none focus:ring-2 focus:ring-teal-400"
                      value={nuevoMovimientoFinanciero.valor}
                      onChange={(e) =>
                        setNuevoMovimientoFinanciero({
                          ...nuevoMovimientoFinanciero,
                          valor: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">
                      Concepto / Detalle
                    </label>
                    <input
                      placeholder="Ej: Compra de Purina Inicio, Vacunas, Servicios públicos, etc."
                      className="w-full p-2.5 border rounded-2xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-teal-400"
                      value={nuevoMovimientoFinanciero.concepto}
                      onChange={(e) =>
                        setNuevoMovimientoFinanciero({
                          ...nuevoMovimientoFinanciero,
                          concepto: e.target.value,
                        })
                      }
                    />
                  </div>

                  {nuevoMovimientoFinanciero.tipo === 'gasto_granja' && (
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">
                        Categoría
                      </label>
                      <select
                        className="w-full p-2.5 bg-slate-50 border rounded-2xl text-xs font-bold text-slate-700"
                        value={nuevoMovimientoFinanciero.categoria}
                        onChange={(e) =>
                          setNuevoMovimientoFinanciero({
                            ...nuevoMovimientoFinanciero,
                            categoria: e.target.value,
                          })
                        }
                      >
                        <option value="Insumos">
                          Insumos (Alimento, panales, etc.)
                        </option>
                        <option value="Infraestructura">
                          Infraestructura (Construcción, herramientas)
                        </option>
                        <option value="Aves">
                          Aves (Nuevas gallinas, repuestos)
                        </option>
                        <option value="Sanidad">
                          Sanidad (Vacunas, medicamentos)
                        </option>
                        <option value="Otros">Otros</option>
                      </select>
                    </div>
                  )}

                  {nuevoMovimientoFinanciero.tipo !== 'inyeccion_socio' &&
                    nuevoMovimientoFinanciero.tipo !== 'retorno_socio' && (
                      <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200">
                        <label className="text-[10px] font-black text-amber-950 uppercase block mb-1">
                          Fuente de Financiamiento
                        </label>
                        <select
                          className="w-full p-2 bg-white border rounded-xl text-xs font-bold text-slate-700"
                          value={nuevoMovimientoFinanciero.fuenteFinanciamiento}
                          onChange={(e) =>
                            setNuevoMovimientoFinanciero({
                              ...nuevoMovimientoFinanciero,
                              fuenteFinanciamiento: e.target.value,
                            })
                          }
                        >
                          <option value="Ventas de Finca">
                            Cubierto por las Ventas Propias (Flujo de Caja)
                          </option>
                          <option value="Inyección de Socio">
                            Inyectado de otra fuente (Dinero que tú inyectas ➡️
                            Suma a Deuda)
                          </option>
                        </select>
                      </div>
                    )}

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
                    <List className="text-teal-700" /> Registro de Caja Diaria (
                    {fecha})
                  </h2>

                  <div className="bg-red-50 p-4 rounded-3xl border border-red-200 shadow-sm mb-4">
                    <h3 className="font-extrabold text-xs text-red-900 mb-2 flex items-center gap-1">
                      <Truck size={14} /> Gastos Operativos del Día en
                      Distribuidora
                    </h3>

                    <div className="flex gap-2 mb-3">
                      <input
                        placeholder="Gasolina, empaques, comida..."
                        className="w-full p-2 border rounded-xl text-xs font-semibold bg-white"
                        value={nuevoGastoDist.concepto}
                        onChange={(e) =>
                          setNuevoGastoDist({
                            ...nuevoGastoDist,
                            concepto: e.target.value,
                          })
                        }
                      />
                      <input
                        type="number"
                        placeholder="$"
                        className="w-20 p-2 border rounded-xl text-xs text-center font-bold bg-white"
                        value={nuevoGastoDist.valor}
                        onChange={(e) =>
                          setNuevoGastoDist({
                            ...nuevoGastoDist,
                            valor: e.target.value,
                          })
                        }
                      />
                      <button
                        onClick={agregarGastoDist}
                        className="bg-red-600 text-white p-2 rounded-xl hover:bg-red-700 shadow-md"
                      >
                        <PlusCircle size={18} />
                      </button>
                    </div>

                    <ul className="text-xs space-y-1">
                      {(datosDia.gastos || []).map((g) => (
                        <li
                          key={g.id}
                          className="flex justify-between items-center bg-white p-2 rounded-xl border border-red-100"
                        >
                          <span className="text-slate-700 font-semibold">
                            {g.concepto}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-red-600">
                              -${g.valor.toLocaleString()}
                            </span>
                            <button
                              onClick={() => borrarGastoDist(g.id)}
                              className="text-slate-300 hover:text-red-500"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-green-50 p-4 rounded-3xl border border-green-200 mb-4">
                    <h3 className="font-extrabold text-xs text-green-900 mb-2 flex items-center gap-1">
                      <Wallet size={14} /> Cobros de Hoy (Abonos de Deudas
                      Viejas)
                    </h3>
                    {(datosDia.cobros || []).length > 0 ? (
                      <ul className="space-y-1.5 text-xs">
                        {datosDia.cobros.map((c) => (
                          <li
                            key={c.id}
                            className="bg-white p-2 rounded-xl border border-green-100 flex justify-between items-center"
                          >
                            <div>
                              <span className="font-extrabold text-slate-700">
                                {c.cliente}
                              </span>
                              <span className="text-[10px] text-green-600 ml-2 bg-green-50 px-2 py-0.5 rounded-full font-bold">
                                {c.nota}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] bg-purple-100 text-purple-600 px-1 rounded font-black">
                                {c.metodoPago}
                              </span>
                              <span className="font-extrabold text-green-600">
                                +${c.valor.toLocaleString()}
                              </span>
                              <button
                                onClick={() => borrarCobroHoy(c)}
                                className="text-slate-300 hover:text-red-500"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[10px] text-green-700 italic font-bold">
                        Nadie ha pagado deudas hoy.
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-slate-900 text-white p-5 rounded-3xl border-t-4 border-emerald-500 shadow-xl">
                  <h3 className="font-black text-sm text-yellow-400 border-b border-slate-800 pb-2 flex items-center gap-2">
                    <CheckCircle size={18} /> Resumen de Caja Real Unificada
                  </h3>

                  <div className="space-y-2 mt-4 text-xs font-semibold text-slate-300">
                    <div className="flex justify-between">
                      <span>(+) Ventas Hoy (Efectivo Distribuidora):</span>
                      <span>
                        $
                        {(datosDia.ventas || [])
                          .filter(
                            (v) =>
                              Number(v.abonado || 0) > 0 &&
                              v.metodoPago === 'Efectivo'
                          )
                          .reduce((sum, v) => sum + Number(v.abonado || 0), 0)
                          .toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>(+) Ventas Hoy (Efectivo Finca):</span>
                      <span>
                        $
                        {(datosDia.fincaVentas || [])
                          .filter((v) => v.metodoPago === 'Efectivo')
                          .reduce((sum, v) => sum + Number(v.total || 0), 0)
                          .toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-green-300">
                      <span>(+) Cobro de Cartera (Efectivo):</span>
                      <span>
                        +$
                        {(datosDia.cobros || [])
                          .filter((c) => c.metodoPago === 'Efectivo')
                          .reduce((sum, c) => sum + Number(c.valor || 0), 0)
                          .toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-red-300 border-b border-slate-800 pb-2">
                      <span>(-) Gastos del día (Caja Distribuidora):</span>
                      <span>-${calculosHoy.gastosHoy.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between font-black text-base text-green-400 pt-2 border-b border-slate-800 pb-2">
                      <span>= EFECTIVO EN MANO:</span>
                      <span>
                        ${calculosHoy.efectivoEnMano.toLocaleString()}
                      </span>
                    </div>

                    <div className="pt-2">
                      <div className="flex justify-between text-purple-300 mb-1">
                        <span>
                          (+) Recibido en Nequi Hoy (Ventas + Cartera):
                        </span>
                        <span>${calculosHoy.totalNequi.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-black text-lg text-white bg-teal-800 p-3 rounded-2xl mt-2 border border-teal-700">
                        <span>TOTAL A CONSIGNAR:</span>
                        <span>
                          ${calculosHoy.totalConsignar.toLocaleString()}
                        </span>
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
                  <h2 className="font-black text-slate-800">
                    Contabilidad Financiera Histórica
                  </h2>
                  <p className="text-xs text-slate-500 font-semibold">
                    Listado plano de ingresos, egresos, nóminas e inyecciones de
                    socios sin semanas.
                  </p>
                </div>
                <div className="text-center md:text-right bg-teal-800 text-white p-3 rounded-2xl shadow-md">
                  <span className="text-[9px] font-black uppercase text-teal-200 tracking-wider">
                    Flujo Consolidado en Sistema
                  </span>
                  <p className="text-xl font-black">
                    $
                    {transactions
                      .reduce(
                        (acc, t) =>
                          t.type === 'ingreso'
                            ? acc + Number(t.amount || 0)
                            : acc - Number(t.amount || 0),
                        0
                      )
                      .toLocaleString()}
                  </p>
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
                        <th className="px-4 py-3">Financiamiento</th>
                        <th className="px-4 py-3 text-right">Monto</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {transactions.map((t) => {
                        const esInyeccion = t.type === 'inyeccion_socio';
                        const esRetorno = t.type === 'retorno_socio';

                        return (
                          <tr
                            key={t.id}
                            className="hover:bg-slate-50 font-semibold text-slate-700"
                          >
                            <td className="px-4 py-3 text-xs text-slate-500 font-bold">
                              {t.date}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-900">
                              {t.description}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                                  t.type === 'ingreso'
                                    ? 'bg-green-100 text-green-700'
                                    : t.type === 'gasto_nomina'
                                    ? 'bg-purple-100 text-purple-700'
                                    : esInyeccion
                                    ? 'bg-blue-100 text-blue-700'
                                    : esRetorno
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {t.category || t.type}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-[10px] bg-slate-100 px-2.5 py-1 rounded-full font-bold text-slate-500">
                                {t.fuenteFinanciamiento || 'Socio / Directo'}
                              </span>
                            </td>
                            <td
                              className={`px-4 py-3 text-right font-black ${
                                t.type === 'ingreso' || esInyeccion
                                  ? 'text-teal-600'
                                  : 'text-red-500'
                              }`}
                            >
                              {t.type === 'ingreso' || esInyeccion ? '+' : '-'}$
                              {Number(t.amount || 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => borrarMovimientoFinanciero(t.id)}
                                className="text-slate-300 hover:text-red-500"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {transactions.length === 0 && (
                        <tr>
                          <td
                            colSpan="6"
                            className="text-center py-10 text-slate-400 italic font-semibold"
                          >
                            No se han registrado transacciones financieras en el
                            ledger histórico.
                          </td>
                        </tr>
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
          <span>
            Desarrollado para unificación inteligente y toma de decisiones
            precisas • v3.0
          </span>
        </div>
      </div>
    </div>
  );
}
