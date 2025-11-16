import { tags } from "typia";

export namespace ITodoAppGuestUserRefresh {
  /**
   * Request DTO for refreshing JWT tokens for a guestUser session.
   *
   * This type encapsulates the refresh token issued during the guestUser join
   * flow together with optional client metadata needed to validate and rotate
   * the underlying session in `todo_app_guestuser_sessions`. The backend uses
   * this payload to locate a non-expired session and its associated identity
   * in `todo_app_guestusers` before issuing new tokens.
   *
   * Clients typically call this endpoint before their access token expires,
   * reusing the refresh token while optionally supplying updated connection
   * context. Validation errors on this payload must be clearly distinguished
   * from authorization failures so that clients can decide whether to start a
   * new guest flow or correct the input and retry.
   */
  export type IRequest = {
    /**
     * Refresh token previously issued to the guestUser during the join or a
     * prior refresh operation.
     *
     * The server decodes and validates this value to locate the
     * corresponding row in `todo_app_guestuser_sessions` and confirm that
     * the associated guest identity in `todo_app_guestusers` is still
     * valid. It must be treated as a confidential credential and never
     * logged or exposed in client-side error messages.
     */
    refresh_token: string;

    /**
     * Optional client IP address observed when the refresh request is sent.
     *
     * When provided, this value supplements or overrides transport-level IP
     * detection for auditing and anomaly detection tied to the
     * `todo_app_guestuser_sessions` row. It may be omitted or null if the
     * server will infer IP directly from the HTTP connection.
     */
    ip?: string | null | undefined;

    /**
     * Absolute URL of the page where the refresh call is initiated.
     *
     * This value mirrors the `href` field stored in
     * `todo_app_guestuser_sessions` and helps reconstruct navigation
     * context for telemetry and security review. Clients should pass the
     * full current location URL including path and query string.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL indicating the previous page or origin that led to the
     * current refresh request.
     *
     * The backend may compare this value with historical session data for
     * the same guest in `todo_app_guestuser_sessions` to detect unusual
     * navigation patterns. When the user navigated directly, clients can
     * still send a sensible referrer such as the application entry URL
     * instead of leaving it empty.
     */
    referrer: string & tags.Format<"uri">;
  };
}
