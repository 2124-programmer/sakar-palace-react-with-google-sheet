/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_SHEET_ID?: string;
  readonly VITE_GOOGLE_SHEETS_API_KEY?: string;
  readonly VITE_ENABLE_TEST_USER?: string;
  readonly VITE_TEST_USER_MOBILE?: string;
  readonly VITE_TEST_USER_CODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
