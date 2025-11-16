export namespace IShoppingMallPlatformAdminRefresh {
  /**
   * Request payload for refreshing JWT tokens for a platform administrator
   * using an existing valid refresh token.
   *
   * This DTO carries the refresh token issued during a prior successful login
   * or join operation, plus optional client context fields used for logging
   * and risk analysis. The backend uses the token to locate the associated
   * `shopping_mall_auth_credentials` record with `actor_type =
   * "platformAdmin"`, verify eligibility for refresh, and then issue new JWT
   * tokens.
   *
   * Unlike login and join DTOs, this refresh payload does not create a new
   * credential; it only validates the existing refresh token and records
   * audit data in `shopping_mall_auth_logs` and related security tables.
   */
  export type IRequest = {
    /**
     * Refresh token previously issued to the platform administrator.
     *
     * The backend validates this token against its server-side token store
     * to ensure it has not expired or been revoked, then uses its subject
     * information to locate the corresponding
     * `shopping_mall_auth_credentials` record for a `platformAdmin` actor.
     */
    refreshToken: string;

    /**
     * Optional client IP address associated with this refresh request.
     *
     * If provided, it should be a textual IPv4 or IPv6 address and is
     * recorded in `shopping_mall_auth_logs` and security telemetry. When
     * omitted, the server derives the IP from the incoming HTTP request
     * context.
     */
    ip?: string | null | undefined;

    /**
     * Optional user agent string describing the client software that is
     * performing the refresh.
     *
     * Typical values are HTTP User-Agent headers identifying the browser or
     * native client. The implementation may persist this value into
     * `shopping_mall_auth_logs` or `shopping_mall_security_events` for
     * anomaly detection and device analytics.
     */
    userAgent?: string | null | undefined;

    /**
     * Optional correlation or trace identifier propagated from the client.
     *
     * This identifier can be used to join refresh activity to other
     * application logs and distributed traces, improving observability
     * around administrator authentication flows.
     */
    correlationId?: string | null | undefined;
  };
}
