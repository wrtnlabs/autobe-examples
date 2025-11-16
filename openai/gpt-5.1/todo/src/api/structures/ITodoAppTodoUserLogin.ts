import { tags } from "typia";

export namespace ITodoAppTodoUserLogin {
  /**
   * Login request payload for authenticating an existing todoUser account.
   * Accepts email and password credentials along with connection context used
   * to create a todo_app_todouser_sessions record.
   *
   * This DTO is designed to capture the minimal credentials required to
   * authenticate a registered todo user as well as optional contextual
   * information about the client environment. The backend uses this
   * information both to verify identity against `todo_app_todousers` and to
   * create a corresponding session row in `todo_app_todouser_sessions` for
   * auditing and security analysis.
   */
  export type IRequest = {
    /**
     * Email address of the todoUser used as the unique login identifier.
     *
     * This value must correspond to the `email` column in
     * `todo_app_todousers`, which is enforced as unique and acts as the
     * primary login key. Clients must provide a syntactically valid email
     * address; the backend will use this to locate the matching user record
     * for authentication.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain-text password provided by the todoUser for authentication.
     *
     * The backend hashes this value using the same algorithm as was used
     * when storing the password and compares the result to the
     * `password_hash` column in `todo_app_todousers`. This value is never
     * stored or logged in plain text and should be transmitted only over
     * secure channels such as HTTPS.
     */
    password: string;

    /**
     * Optional client IP address for session tracking and security
     * monitoring.
     *
     * When present, the value is stored in the `ip` column of
     * `todo_app_todouser_sessions` to support auditing, anomaly detection,
     * and rate limiting. When omitted or null, the service may attempt to
     * derive the IP from connection metadata instead of the request body.
     */
    ip?: string | null | undefined;

    /**
     * Current page URL at the time of login, captured as connection
     * context.
     *
     * This value is stored in the `href` column of
     * `todo_app_todouser_sessions` when provided. It can be used later to
     * analyze login entry points, UX flows, and potential phishing or
     * spoofing attempts based on unusual URLs.
     */
    href?: (string & tags.Format<"uri">) | undefined;

    /**
     * Referrer URL from which the user arrived at the login page, used for
     * audit and security analysis.
     *
     * When supplied, this value is written into the `referrer` column of
     * `todo_app_todouser_sessions`. It helps understand navigation patterns
     * and can be used for troubleshooting or detecting suspicious
     * redirection chains.
     */
    referrer?: (string & tags.Format<"uri">) | undefined;
  };
}
