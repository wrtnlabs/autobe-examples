import { tags } from "typia";

export namespace IDiscussionBoardAdminUserJoin {
  /**
   * Request payload for registering a new administrative user for the
   * discussionBoard service.
   *
   * This DTO supplies the core credentials and profile information required
   * to create a new row in `discussion_board_adminusers`, including login
   * email, plain-text password, display name, and optional bio.
   *
   * The service layer hashes the password into the `password_hash` column,
   * initializes lifecycle fields such as `email_verified`, `account_status`,
   * `created_at`, and `updated_at`, and then issues initial JWT tokens via a
   * separate authorized response schema.
   *
   * In addition, this join operation immediately establishes an authenticated
   * admin session. Therefore it also carries connection metadata (IP, href,
   * referrer) so that the backend can create an appropriate admin session
   * record for auditing and security analysis.
   */
  export type IRequest = {
    /**
     * Administrator email address to be used as the unique login identifier
     * and primary contact channel.
     *
     * Must satisfy the uniqueness constraint on
     * `discussion_board_adminusers.email` and comply with standard email
     * format validation.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain-text password chosen by the administrator for authentication.
     *
     * This value is never stored directly; instead, the service hashes it
     * into the `password_hash` column of `discussion_board_adminusers`
     * according to security policy.
     */
    password: string & tags.Format<"password">;

    /**
     * Public or semi-public display name for the administrator account.
     *
     * Shown in audit trails or where admin-originated content is
     * attributed, corresponding conceptually to the `display_name` column
     * in `discussion_board_adminusers`.
     */
    display_name: string;

    /**
     * Optional short profile or role description for this administrator
     * account.
     *
     * When provided, it maps to the nullable `bio` column on
     * `discussion_board_adminusers`; when omitted or null, the profile has
     * no additional description.
     */
    bio?: string | null | undefined;

    /**
     * Optional IP address for the admin's current connection, used for
     * session and security auditing.
     *
     * When provided, this should be the client IP in a standard textual
     * representation (IPv4 or IPv6). If omitted or null, the backend may
     * derive the IP from the underlying HTTP request context.
     */
    ip?: string | null | undefined;

    /**
     * Connection URL (current page URL) at the time the registration (join)
     * request is initiated.
     *
     * This value is stored in admin session records (for example, in
     * `discussion_board_adminuser_sessions`) to provide contextual
     * information about where the administrator started their first
     * authenticated session. It must be a valid absolute URI representing
     * the frontend location.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL (previous page URL) that led to the registration (join)
     * request.
     *
     * This value is used for security analysis and UX diagnostics and is
     * also recorded in admin session tables. It should be a valid absolute
     * URI; when there is no referrer, clients may send a generic landing
     * URL according to frontend policy.
     */
    referrer: string & tags.Format<"uri">;
  };
}
