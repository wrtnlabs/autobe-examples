import { tags } from "typia";

export namespace ITodoAppTodoUserJoin {
  /**
   * Request DTO for registering a new todoUser account in
   * `todo_app_todousers`.
   *
   * This payload supplies the minimal credential and profile information
   * required to create a new authenticated end user who will later own Todo
   * items. The backend validates the email for uniqueness, hashes the
   * submitted password into the `password_hash` column, initializes lifecycle
   * fields such as `status`, and sets timestamps `created_at` and
   * `updated_at`.
   *
   * On success, the server creates a new row in `todo_app_todousers` with a
   * generated `id` and returns an authorization response containing tokens
   * and basic profile data. Plain-text passwords are never stored; this DTO
   * only carries the transient password value necessary for hash generation
   * during registration.
   *
   * In addition, this self-signup operation immediately establishes an
   * authentication session for the new todoUser. The `ip`, `href`, and
   * `referrer` fields provide the connection metadata required to create the
   * corresponding session record and to support audit trails, anomaly
   * detection, and security monitoring.
   */
  export type IRequest = {
    /**
     * Email address used as the unique login identifier for the todoUser.
     *
     * This value maps to the `email` column in `todo_app_todousers`, which
     * is constrained by a unique index. The backend must reject requests
     * that attempt to reuse an existing email and return a clear validation
     * error so clients can guide users to choose a different address or
     * recover their account.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain-text password chosen by the new todoUser.
     *
     * The service hashes this value using a strong one-way algorithm and
     * stores the result in the `password_hash` column of
     * `todo_app_todousers`. The raw password MUST never be persisted or
     * logged. Validation rules such as minimum length or complexity should
     * be enforced at the service layer before account creation.
     */
    password: string & tags.Format<"password">;

    /**
     * Optional human-readable name for the todoUser.
     *
     * When provided, this value populates the nullable `display_name`
     * column in `todo_app_todousers` and is used in user interfaces and
     * administrative views. If omitted or null, the display name remains
     * unset and the system may fall back to showing the email address or
     * another identifier.
     */
    display_name?: string | null | undefined;

    /**
     * Optional client IP address observed when the registration request is
     * sent.
     *
     * When provided, this value supplements or overrides transport-level IP
     * detection for auditing, security analytics, and anomaly detection
     * associated with the initial session created for this todoUser
     * account. It may be omitted or null when the server will infer the IP
     * directly from the HTTP connection.
     */
    ip?: string | null | undefined;

    /**
     * Absolute URL of the page where the registration (join) call is
     * initiated.
     *
     * This value is used as connection metadata when creating the initial
     * authentication session for the new todoUser, mirroring the semantics
     * of the `href` field stored in actor-specific session tables. Clients
     * should send the full current location URL, including path and query
     * string, to enable accurate reconstruction of signup context.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL indicating the previous page or origin that led to the
     * registration request.
     *
     * The backend can use this value together with `href` and `ip` to build
     * an audit trail around where the account was created from and to
     * detect unusual or malicious signup patterns. When the user navigated
     * directly, clients may still supply a sensible referrer such as the
     * application landing page instead of leaving it blank.
     */
    referrer: string & tags.Format<"uri">;
  };
}
