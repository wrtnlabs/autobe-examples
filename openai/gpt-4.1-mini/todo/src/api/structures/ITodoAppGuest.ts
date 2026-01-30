import { tags } from "typia";

import { ITodoAppAccessToken } from "./ITodoAppAccessToken";

export namespace ITodoAppGuest {
  /**
   * Request DTO for guest user registration allowing creation of a temporary
   * guest account in the todo application. This schema captures
   * guest-provided identification (email) and connection context metadata
   * (ip, href, referrer) essential for audit and security logging. The unique
   * guest identifier and session management fields are maintained internally
   * and are not part of this request. Excludes actor identity fields to
   * ensure security compliance.
   */
  export type IJoin = {
    /**
     * Email address submitted by the guest user for identification
     * purposes. Must follow valid email formatting as per RFC 5322.
     */
    email: string & tags.Format<"email">;

    /**
     * Optional IP address of the guest user's connection origin. This
     * provides additional security and audit information. Can be null if
     * unknown or not supplied.
     */
    ip?: string | null | undefined;

    /**
     * The URL of the current page where the guest user initiates the join
     * request. Required for session context establishment and security
     * analysis.
     */
    href: string;

    /**
     * The URL of the referring page leading to the join request. Empty
     * string if the guest accessed the request page directly. Used for
     * analytics and security tracking.
     */
    referrer: string;
  };

  /**
   * Authorized guest session response payload representing a temporary guest
   * user in the todo application.
   *
   * This schema includes the unique guest identifier and the JWT
   * authorization token issued upon successful guest registration or token
   * refresh. It is used to authenticate and authorize guest users with
   * limited lifetime and minimal privileges.
   *
   * The guest session is transient and managed with strict security policies
   * to ensure safe access.
   *
   * Used in responses for endpoints '/todoApp/auth/guest/join' and
   * '/todoApp/auth/guest/refresh'.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the guest user in the system. Corresponds to
     * the primary key in the 'todo_app_guests' database table and used to
     * track the guest session lifecycle.
     */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: ITodoAppAccessToken;
  };

  /**
   * Request DTO for refreshing JWT tokens for a guest user session. Contains
   * the valid refresh token string used by the guest to request new access
   * and refresh tokens during authentication refresh operations.
   */
  export type IRefresh = {
    /**
     * The refresh token string provided by the guest client to perform a
     * secure token refresh. This token must be valid, not expired, and
     * corresponds to a session managed via related guest session or access
     * token records.
     */
    refresh_token: string;
  };
}
