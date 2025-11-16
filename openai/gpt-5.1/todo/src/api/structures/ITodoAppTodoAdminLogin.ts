import { tags } from "typia";

export namespace ITodoAppTodoAdminLogin {
  /**
   * Login request payload for a todoAdmin administrative account.
   *
   * This DTO carries the credentials and client context required by the
   * `/auth/todoAdmin/login` endpoint to authenticate an existing
   * administrator. The `email` and `password` fields are used to locate and
   * validate a record in the `todo_app_todoadmins` table, while the
   * contextual fields help populate an entry in `todo_app_todoadmin_sessions`
   * for auditing and security analysis.
   *
   * The server is solely responsible for hashing the provided plain-text
   * password and comparing it against `todo_app_todoadmins.password_hash`, as
   * well as for persisting the resulting session metadata. Clients should
   * treat this schema as the complete contract for initiating an admin login
   * attempt.
   */
  export type IRequest = {
    /**
     * Email address of the todoAdmin account attempting to log in.
     *
     * This value is looked up against the unique
     * `todo_app_todoadmins.email` column to locate the corresponding
     * administrator record. If no record exists for the given email, the
     * login attempt will fail with an authentication error.
     *
     * The email must be syntactically valid and should match exactly what
     * was used at registration time for the admin account.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain-text password for the todoAdmin account.
     *
     * The backend takes this value, applies the configured password hashing
     * algorithm, and compares the result to the stored
     * `todo_app_todoadmins.password_hash`. The raw password is never
     * persisted and must not be pre-hashed by clients.
     *
     * Password strength requirements and validation rules (for example,
     * minimal length or complexity) are enforced by the authentication
     * service and are not explicitly modeled in this schema.
     */
    password: string;

    /**
     * Optional client IP address for this login attempt.
     *
     * When supplied as a string, this value represents the client IP
     * address as perceived by the caller, which may be useful in SSR or
     * reverse-proxy scenarios. When null or omitted, the backend infers the
     * client IP from the underlying HTTP connection and still records an
     * address in the `todo_app_todoadmin_sessions.ip` column.
     *
     * Storing this information supports security monitoring, anomaly
     * detection, and forensic analysis of administrative login activity.
     */
    ip?: string | null | undefined;

    /**
     * Current page URL from which the login request is initiated.
     *
     * This URI is typically captured into the
     * `todo_app_todoadmin_sessions.href` column so that operators can later
     * reconstruct where the login flow was triggered (for example, a
     * dedicated admin sign-in page or an embedded login component).
     *
     * Recording the exact entry URL is valuable for debugging issues with
     * redirect flows and for understanding how administrators access the
     * system.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL representing the previous page before the login form.
     *
     * On successful or failed login attempts, this value can be persisted
     * into `todo_app_todoadmin_sessions.referrer` to provide additional
     * context about navigation behavior and potential phishing vectors.
     *
     * Analytics and security tooling may use this information to detect
     * unusual entry paths or to evaluate the effectiveness of login entry
     * points.
     */
    referrer: string & tags.Format<"uri">;
  };
}
