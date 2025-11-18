import { tags } from "typia";

export namespace ITodoAppMemberUserLogin {
  /**
   * Login payload for authenticating an existing member user in the todoApp
   * service.
   *
   * Clients submit the member's email and password, along with optional
   * connection metadata, to request an authenticated session. The backend
   * validates these credentials against todo_app_memberusers (using email and
   * password_hash) and typically creates a session entry in
   * todo_app_memberuser_sessions using the supplied connection context.
   *
   * This DTO never includes any identity fields such as member IDs, because
   * those are derived by the server from the validated credentials, and it
   * never contains pre-hashed passwords. The raw password is provided in
   * plain text and hashed server-side.
   */
  export type ICreate = {
    /**
     * Email address of the member user attempting to log in.
     *
     * This value is matched against todo_app_memberusers.email and serves
     * as the primary credential identifier during authentication. It must
     * be a syntactically valid email address and is subject to the
     * uniqueness constraint enforced on the member table.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain-text password for the member user.
     *
     * The server hashes this value and compares it to
     * todo_app_memberusers.password_hash; hashed passwords must never be
     * sent by clients. Implementations may enforce additional policies such
     * as minimum length, character variety, or breach checks, but those
     * rules are enforced on the server side, not encoded in this schema.
     */
    password: string;

    /**
     * Optional client IP address associated with this login attempt.
     *
     * When provided, it may be recorded in todo_app_memberuser_sessions.ip
     * for auditing, security analytics, or anomaly detection. If omitted or
     * null, the server can derive the IP from the underlying HTTP request
     * or reverse proxy headers, depending on deployment configuration.
     */
    ip?: string | null | undefined;

    /**
     * Absolute URL of the page from which the login request is initiated.
     *
     * This connection context is typically persisted in
     * todo_app_memberuser_sessions.href and can help operators understand
     * from which route or screen the authentication attempt originated. It
     * must be a valid URI string, usually matching the frontend application
     * location.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referring URL that led the client to the login page.
     *
     * This value is often stored in todo_app_memberuser_sessions.referrer
     * and may be an empty page or external site that navigated to the login
     * screen. It is useful for analyzing user flows and potential security
     * concerns such as phishing, but is not required for successful
     * authentication.
     */
    referrer: string & tags.Format<"uri">;
  };
}
