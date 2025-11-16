import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IDiscussionBoardGuest {
  /**
   * Guest registration request data for creating temporary anonymous
   * accounts.
   *
   * This DTO represents the minimal information required to register a guest
   * user in the system. Guest registration is designed to be as frictionless
   * as possible, requiring no personal information, email, or password. The
   * primary purpose is to establish a trackable session for anonymous
   * visitors while they browse public content.
   *
   * The request includes session context fields (ip, href, and referrer) that
   * are mandatory for tracking the guest's connection details, entry point,
   * and navigation flow. These fields enable the system to understand how
   * guests discover and interact with the platform, providing essential
   * analytics and security monitoring capabilities.
   *
   * Guest accounts created through this DTO are temporary and intended for
   * read-only access. They do not grant posting, commenting, or any write
   * operation privileges. The backend will generate a unique guest identifier
   * and establish a session record in the discussion_board_guests table
   * without requiring authentication credentials.
   */
  export type ICreate = {
    /**
     * Client IP address for session tracking and security monitoring.
     *
     * This required field captures the IP address of the guest user's
     * connection. The IP address is stored in the session record in the
     * discussion_board_guests table for audit trails and security
     * analysis.
     *
     * While the server can typically extract this from the request headers
     * in most scenarios, clients must provide it explicitly to ensure the
     * database constraint is satisfied. The IP address enables tracking of
     * guest browsing patterns, security monitoring, and analytics about
     * visitor sources.
     *
     * Format should be valid IPv4 or IPv6 address. This field is required
     * because the database schema defines it as a non-nullable String
     * field.
     */
    ip: string;

    /**
     * Current page URL where the guest registration is initiated.
     *
     * This required field captures the full URL of the page from which the
     * guest user is registering. It represents the connection URL and
     * provides context about the user's entry point into the application.
     * This information is essential for analytics, tracking user journey,
     * and understanding which pages drive guest registration.
     *
     * Must be a valid URI format representing the complete URL including
     * protocol, domain, and path.
     */
    href: string & tags.Format<"uri">;

    /**
     * Previous page URL that led the user to the registration page.
     *
     * This required field captures the referrer URL, indicating where the
     * guest user came from before initiating registration. It represents
     * the previous page in the user's navigation flow and is crucial for
     * understanding traffic sources and user acquisition channels.
     *
     * Must be a valid URI format. Can be an empty string if the user
     * accessed the site directly without a referrer.
     */
    referrer: string & tags.Format<"uri">;
  };

  /**
   * Response body containing authentication tokens and guest information
   * after successful token refresh.
   *
   * This DTO is returned when a guest user successfully refreshes their
   * access token using a valid refresh token. It provides the renewed JWT
   * tokens necessary for continued platform access, along with the guest's
   * unique identifier for reference.
   *
   * The response enables the client to update its stored authentication
   * credentials and continue making authenticated requests without
   * interruption. Both access and refresh tokens may be rotated depending on
   * the system's token rotation policy, ensuring enhanced security through
   * token refresh cycles.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated guest user.
     *
     * This UUID uniquely identifies the guest account in the
     * discussion_board_guests table. It remains constant throughout the
     * guest's session lifecycle and is embedded in the issued JWT tokens
     * for subsequent authentication.
     *
     * The guest ID is used to track the guest's activities, manage their
     * session state, and associate any temporary data or preferences with
     * their account during their browsing session.
     */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Request body for refreshing guest user access tokens.
   *
   * This DTO contains the refresh token required to renew a guest user's
   * access token. Guest users receive both access and refresh tokens when
   * they first register on the platform. When their access token expires,
   * they use this endpoint to exchange their valid refresh token for a new
   * access token, maintaining session continuity without needing to create a
   * new guest account.
   *
   * The refresh operation is essential for guest user experience, allowing
   * them to continue browsing public content seamlessly. The system validates
   * the provided refresh token against stored session data to ensure it is
   * authentic, unexpired, and associated with a valid guest account.
   */
  export type IRefresh = {
    /**
     * Valid refresh token issued during initial guest registration.
     *
     * This JWT refresh token was provided when the guest account was
     * created and is used to obtain a new access token without
     * re-registering. The token must be valid, not expired, and associated
     * with an existing guest session in the discussion_board_guests table.
     *
     * The refresh token has a longer lifetime than access tokens, allowing
     * guests to maintain their session continuity even after the access
     * token expires. The system validates this token's signature,
     * expiration time, and association with an active guest account before
     * issuing new tokens.
     */
    refresh_token: string;
  };
}
