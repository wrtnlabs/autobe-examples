export namespace IAuthRefresh {
  /** Refresh token information for authentication refresh. */
  export type IRequest = {
    /** Refresh token for authentication refresh. */
    refreshToken: string;
  };
}
