export namespace IShoppingMallCustomerRefresh {
  /**
   * Request payload for refreshing a customer authentication token.
   *
   * Carries the refresh token previously issued to the customer during login
   * or a prior refresh operation. The backend validates this token against
   * server-side state (typically anchored to shopping_mall_customers and
   * shopping_mall_customer_sessions) and, if valid, issues new JWT tokens
   * without requiring credential re-entry.
   */
  export type IRequest = {
    /**
     * Refresh token issued to the customer during a prior authentication
     * event.
     *
     * This opaque string identifies the long-lived authentication state
     * used to obtain new access tokens. It is validated against server-side
     * session or token storage and must not be shared with untrusted
     * parties.
     */
    refreshToken: string;
  };
}
