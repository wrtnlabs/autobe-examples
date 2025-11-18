import { tags } from "typia";

export namespace ITodoAppMemberUserJoin {
  /**
   * Registration request body schema for creating a new authenticated member
   * user.
   *
   * This DTO represents the minimal set of information that a client must
   * provide to register a new member user account backed by the
   * todo_app_memberusers table. It is consumed by the POST
   * /auth/memberUser/join endpoint, which validates the registration data,
   * hashes the supplied password into the password_hash column, initializes
   * account status and security counters, and persists the new member
   * record.
   *
   * In addition to the credential and profile fields, the DTO includes
   * session context metadata (ip, href, referrer) required to create the
   * initial authentication session. The href and referrer values are
   * mandatory connection metadata, while ip is optional and may be derived by
   * the server when not supplied.
   *
   * The structure intentionally excludes internal security and lifecycle
   * fields like failed_login_count, status, timestamps, and any explicit
   * session identifiers, all of which are managed exclusively by backend
   * logic.
   */
  export type IRequest = {
    /**
     * Unique email-style login identifier for the new member user.
     *
     * This value is persisted into the todo_app_memberusers.email column,
     * which is constrained by a unique index. It serves as the primary
     * credential for authentication flows, and must conform to
     * application-level validation rules for acceptable email formats.
     *
     * During registration the backend verifies that no existing member user
     * already uses the same email. On conflict, the endpoint returns a
     * business-level error rather than exposing low-level database details
     * about the uniqueness violation.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain text password chosen by the registering member user.
     *
     * The server consumes this value to derive a secure password_hash that
     * is stored in the todo_app_memberusers.password_hash column. The raw
     * password itself is never persisted and should not be logged or echoed
     * back to the client.
     *
     * Business rules from the authentication requirements define complexity
     * constraints such as minimum length, required character classes, and
     * rejection of common or compromised passwords. The endpoint enforces
     * these rules and reports validation errors using the global
     * error-handling strategy.
     */
    password: string & tags.Format<"password">;

    /**
     * Optional human-friendly display name for the new member user.
     *
     * When provided, this value is written to the
     * todo_app_memberusers.display_name column and can be used in user
     * interfaces and logs to present a readable identity. It has no role in
     * authentication or authorization decisions and may be omitted entirely
     * during registration.
     *
     * Clients may allow the user to customize this value at registration
     * time, or the field can be set later via dedicated profile update
     * operations.
     */
    display_name?: string | undefined;

    /**
     * Optional IP address associated with the client initiating the
     * registration request.
     *
     * This value is stored in the initial session record for the member
     * user and used for security auditing, anomaly detection, and geo- or
     * device-based checks. It may represent either an IPv4 or IPv6
     * address.
     *
     * When omitted or null, the server determines the effective client IP
     * from the underlying network connection details.
     */
    ip?: string | null | undefined;

    /**
     * Full URL of the page or endpoint from which the registration request
     * originates.
     *
     * This captures the entry point context at the time the new member user
     * account and its initial session are created, including protocol,
     * host, path, and optionally query string.
     *
     * The value is persisted in the session table associated with the new
     * member user and is used for analytics, security review, or tracing
     * user journeys around sign-up events.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL reported by the client when the registration is
     * initiated.
     *
     * This represents the previous location from which the user navigated
     * before reaching the registration page or starting the sign-up flow.
     *
     * The value is stored alongside the session data to support navigation
     * path analysis, marketing attribution, and security investigations.
     */
    referrer: string & tags.Format<"uri">;
  };
}
