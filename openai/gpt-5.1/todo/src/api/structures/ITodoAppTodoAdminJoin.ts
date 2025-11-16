import { tags } from "typia";

export namespace ITodoAppTodoAdminJoin {
  /**
   * Request body schema for registering (joining) a new todoAdmin
   * administrative account.
   *
   * This DTO is used by the public admin registration endpoint to create a
   * new record in `todo_app_todoadmins`. It carries the minimal identity
   * information required to establish an admin account and initiate an
   * authenticated session.
   *
   * It never includes pre-hashed credential fields such as `password_hash`;
   * the backend is responsible for hashing the plain password value into the
   * corresponding Prisma column. Session context fields are included so that
   * an initial `todo_app_todoadmin_sessions` record can be created with
   * accurate connection metadata.
   */
  export type IRequest = {
    /**
     * Email address for the new administrative account.
     *
     * This value becomes the primary login identifier for the todoAdmin
     * actor and is stored in the `todo_app_todoadmins.email` column, which
     * enforces uniqueness.
     *
     * Must be a syntactically valid email address and must not conflict
     * with an existing admin account.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain-text password for the new administrative account.
     *
     * The server receives this value and transforms it into a secure hash,
     * stored in `todo_app_todoadmins.password_hash`. Clients must never
     * send pre-hashed passwords; hashing is exclusively a backend
     * responsibility.
     *
     * Password strength requirements (such as minimum length or complexity)
     * are enforced by validation logic outside this schema.
     */
    password: string;

    /**
     * Optional human-readable display name for the administrative user.
     *
     * When provided, it is persisted in `todo_app_todoadmins.display_name`
     * and used in dashboards and audit views to identify the admin more
     * clearly than by email alone.
     *
     * Can be null when the admin chooses not to set a display name at
     * registration time.
     */
    displayName?: string | null | undefined;

    /**
     * Client IP address at the time of admin registration.
     *
     * Used to populate the `ip` column of the initial
     * `todo_app_todoadmin_sessions` row associated with this registration.
     * When the server can reliably infer the IP from the transport layer,
     * this field may be null.
     *
     * When provided, it should represent either an IPv4 or IPv6 address in
     * string form.
     */
    ip?: string | null | undefined;

    /**
     * Full URL that the administrative user was visiting when starting the
     * registration flow.
     *
     * Stored in `todo_app_todoadmin_sessions.href` for auditing and
     * analytics, allowing operators to reconstruct where the registration
     * originated.
     *
     * Must be a valid absolute URI string.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL from which the administrative user navigated into the
     * registration page.
     *
     * Persisted in `todo_app_todoadmin_sessions.referrer` to provide
     * additional context for session analysis and fraud detection.
     *
     * Must be a valid URI string; can represent an empty or generic origin
     * when no referrer is available, depending on client behavior.
     */
    referrer: string & tags.Format<"uri">;
  };
}
