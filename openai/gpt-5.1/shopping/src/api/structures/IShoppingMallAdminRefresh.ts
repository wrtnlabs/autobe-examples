import { tags } from "typia";

export namespace IShoppingMallAdminRefresh {
  /**
   * Request payload for refreshing administrator JWT tokens using an existing
   * session.
   *
   * This DTO is used by the POST /auth/admin/refresh endpoint to rotate
   * access and refresh tokens for an already authenticated admin, based on
   * persisted state in the shopping_mall_admins and
   * shopping_mall_admin_sessions tables. Instead of including credentials, it
   * carries a refresh token that has been issued previously by the login or
   * join flow.
   *
   * The refreshToken field identifies the logical session and admin via
   * metadata encoded within the token. The href and referrer fields provide
   * additional context for the refresh request and can be used to update or
   * create a corresponding session row in shopping_mall_admin_sessions,
   * particularly for tracking where and how token rotation occurs. An
   * optional ip field allows explicit client IP reporting, but servers may
   * replace or ignore it in favor of trusted source information.
   *
   * This type must not include any admin ID or session ID fields. The backend
   * derives those from the presented refresh token and validates them against
   * the current database state before issuing new tokens.
   */
  export type ICreate = {
    /**
     * Opaque refresh token string previously issued to the admin.
     *
     * The authentication subsystem decodes or validates this token to
     * recover identifiers that map to a specific admin row in
     * shopping_mall_admins and a session row in
     * shopping_mall_admin_sessions. It is treated as a sensitive credential
     * and must be transported and stored securely by clients.
     *
     * On receipt, the server checks that the associated session has not
     * expired and that the underlying admin account remains eligible for
     * access before issuing new tokens.
     */
    refreshToken: string;

    /**
     * Client IP address associated with the token refresh request.
     *
     * This optional field mirrors the session context semantics of the
     * login DTO. It can be recorded in the corresponding
     * shopping_mall_admin_sessions row to track where refresh activity
     * originates and to support anomaly detection.
     *
     * If null or omitted, the server calculates the IP from the actual
     * connection source. Implementations should treat any client-supplied
     * IP as advisory only and prefer trusted transport metadata.
     */
    ip?:
      | (string & tags.Format<"ipv4">)
      | (string & tags.Format<"ipv6">)
      | null
      | undefined;

    /**
     * Full URL at which the refresh request was initiated.
     *
     * This value is used to enrich or update the session context in
     * shopping_mall_admin_sessions, enabling operators to see which
     * administrative views or front-end routes are responsible for token
     * rotations. It typically reflects the URL of the page that silently or
     * explicitly triggered the refresh.
     *
     * Recording this information improves observability into how long-lived
     * admin sessions behave in practice.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL present when the refresh call was made.
     *
     * As with login, this value may be stored in the referrer column of
     * shopping_mall_admin_sessions for visibility into navigation patterns
     * associated with token rotation. It can indicate which part of the
     * admin workflow led to the refresh event.
     *
     * When the admin interacts directly from a bookmarked page or
     * non-standard flow, this field helps reconstruct that context for
     * audit and debugging purposes.
     */
    referrer: string & tags.Format<"uri">;
  };
}
