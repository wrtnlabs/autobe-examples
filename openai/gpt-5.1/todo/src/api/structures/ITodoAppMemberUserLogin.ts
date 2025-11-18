import { tags } from "typia";

export namespace ITodoAppMemberUserLogin {
  /**
   * Login request payload for authenticating an existing todoApp member user.
   *
   * This DTO is consumed by the member user login endpoint that validates
   * credentials against the `todo_app_memberusers` table. It carries the
   * minimal set of information required to perform password-based
   * authentication together with session context metadata.
   *
   * The `email` and `password` fields represent the member user's
   * credentials. The password is provided in plain text over a secure
   * transport and is never stored directly; the backend compares a secure
   * hash of this value with the `password_hash` column in
   * `todo_app_memberusers`.
   *
   * The `href` and `referrer` fields capture the connection context at the
   * time of authentication and are required for session tracking and security
   * analytics. The optional `ip` field may be supplied by clients that are
   * able to determine the effective client IP, but the backend can also
   * derive it from the network layer when omitted.
   *
   * This DTO does not contain any user identifiers such as the member user ID
   * from the database, as those are resolved by the authentication process
   * itself.
   */
  export type IRequest = {
    /**
     * Email identifier used as the unique login name for the member user.
     *
     * This value is matched against the `email` column of
     * `todo_app_memberusers`, which has a unique index.
     *
     * The format must be a syntactically valid email address according to
     * standard email address rules, and business rules may apply additional
     * constraints such as domain restrictions.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain-text password supplied by the member user for authentication.
     *
     * The backend hashes this value and compares it against the
     * `password_hash` column in `todo_app_memberusers`. The raw password is
     * never stored.
     *
     * Password complexity requirements and minimum length constraints are
     * defined in the authentication requirements document and must be
     * enforced during validation.
     */
    password: string & tags.Format<"password">;

    /**
     * Optional IP address associated with the client initiating the login
     * request.
     *
     * This value is used for session tracking, security auditing, and
     * potential anomaly detection. It may represent either an IPv4 or IPv6
     * address.
     *
     * When omitted or null, the server determines the effective client IP
     * from the underlying network connection details.
     */
    ip?: string | null | undefined;

    /**
     * Full URL of the page or endpoint from which the login request
     * originates.
     *
     * This captures the entry point context at the time of authentication,
     * including protocol, host, path, and optionally query string.
     *
     * The value is stored in the session record and used for analytics,
     * security review, or tracing user journeys.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL reported by the client when the login is initiated.
     *
     * This represents the previous location from which the user navigated
     * before reaching the login page or initiating the login flow.
     *
     * The value is stored alongside the session data to support navigation
     * path analysis and security investigations.
     */
    referrer: string & tags.Format<"uri">;
  };
}
