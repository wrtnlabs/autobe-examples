export namespace ICommon {
  /**
   * Request object containing the refresh token to renew JWT access tokens.
   *
   * This request is sent by authenticated discussion board members to obtain
   * new access tokens without re-entering credentials. The refresh token
   * included must be valid and unexpired, as verified by the backend
   * authentication service.
   *
   * Clients must secure the refresh token as it grants continued access to
   * protected resources.
   */
  export type IRefreshTokenRequest = {
    /**
     * The refresh token issued during initial authentication, required for
     * obtaining a new access token.
     */
    refresh_token: string;
  };
}
