export namespace IShoppingMallGuestUserRefresh {
  /**
   * Request payload for refreshing a guestUser authorization session.
   *
   * Carries the refresh token previously issued to the guestUser along with
   * optional telemetry fields used for authentication logging and security
   * analytics. The backend validates the token, checks the associated
   * shopping_mall_guestuser record, and issues a new
   * IShoppingMallGuestUser.IAuthorized envelope on success.
   */
  export type IRequest = {
    /**
     * Refresh token associated with an existing guestUser session.
     *
     * This token is used to request a new access token without
     * re-registering the guest identity.
     */
    refreshToken: string;

    /**
     * Client IP address for this refresh request or null when not
     * explicitly provided.
     *
     * Used for observability and risk analysis in shopping_mall_auth_logs
     * and shopping_mall_security_events. When not supplied or set to null,
     * the backend may still rely on connection-level information for IP
     * derivation.
     */
    ip?: string | null | undefined;

    /**
     * Optional user agent string of the client performing the guest token
     * refresh.
     *
     * This field may be omitted or set to null when the client cannot or
     * does not wish to send a user agent value. When present as a non-empty
     * string, it is persisted into authentication and security logs for
     * device analytics and anomaly detection, complementing the IP address
     * telemetry.
     */
    userAgent?: string | null | undefined;
  };
}
