export namespace IShoppingMallSellerRefresh {
  /**
   * Request payload for refreshing a seller's JWT tokens using an existing
   * refresh token.
   *
   * This DTO is used by the seller token refresh endpoint to submit the
   * refresh token that should be validated and exchanged for a new
   * access/refresh token pair. It carries only the token and optional context
   * metadata, and never includes any seller identifiers or credential IDs,
   * which are resolved internally from the token itself.
   */
  export type IRequest = {
    /**
     * Existing seller refresh token issued by the platform.
     *
     * This value is treated as an opaque string by the client. The backend
     * validates it against the token store, resolves the corresponding
     * credentials and seller identity, and checks expiry and revocation
     * state.
     */
    refreshToken: string;
  };
}
