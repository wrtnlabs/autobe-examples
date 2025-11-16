import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IRedditCommunityVisitor {
  /**
   * Visitor account creation data for unauthenticated guest users who want to
   * browse public communities and content. Enables basic platform access
   * without full community participation features.
   *
   * The visitor registration process creates temporary guest accounts using
   * the reddit_community_visitors table structure. Includes unique nickname
   * and email for identification, password for authentication, and session
   * context fields for tracking browsing activity.
   *
   * Security considerations include password hashing before storage, email
   * and nickname uniqueness validation, and session metadata collection for
   * audit trails. The operation generates initial JWT tokens for temporary
   * access while maintaining guest user limitations.
   *
   * Visitor accounts provide limited platform access focused on browsing
   * capabilities without content creation, voting, or commenting privileges.
   * This design supports content discovery while requiring account creation
   * for interactive features.
   */
  export type ICreate = {
    /**
     * Display name for the visitor. Must be unique across all visitor
     * accounts. Used for identification in browsing activities and
     * community interactions.
     */
    nickname: string & tags.MinLength<1> & tags.MaxLength<255>;

    /**
     * Email address for visitor account. Required for potential account
     * upgrade and communication. Must be unique across all visitor accounts
     * to prevent duplicates.
     */
    email: string & tags.Format<"email">;

    /**
     * Password for visitor account authentication. Plain text that will be
     * hashed by the backend before storage in password_hash field. Required
     * for account security.
     */
    password: string & tags.MinLength<8> & tags.MaxLength<255>;

    /**
     * Client IP address for session tracking. Optional field that server
     * can extract from request, but client may provide for SSR scenarios.
     * Used for security monitoring and connection tracking.
     */
    ip?: string | null | undefined;

    /**
     * Connection URL (current page URL). Required for session tracking to
     * understand visitor navigation patterns and access sources.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL (previous page URL). Required for session tracking to
     * understand traffic sources and user behavior patterns.
     */
    referrer: string & tags.Format<"uri">;
  };

  /**
   * Visitor authentication response containing account details and
   * authentication tokens for unauthenticated guest users. Provides secure
   * access credentials for browsing public content.
   *
   * Returns the authenticated visitor's unique identifier and JWT token
   * information. The response enables subsequent API requests with proper
   * authentication while maintaining guest user limitations and security best
   * practices.
   *
   * The response excludes sensitive authentication data like password hashes
   * while providing the essential information needed for session management
   * and visitor identification. The token information includes both access
   * and refresh tokens with appropriate expiration times, supporting secure
   * session management for visitor browsing activities.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated visitor account. Used for
     * subsequent API requests and session management.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Display name for the visitor. Must be unique across visitor accounts
     * to prevent conflicts.
     */
    nickname: string;

    /**
     * Email address for visitor account. Required for potential account
     * upgrades.
     */
    email: string & tags.Format<"email">;

    /** Timestamp when the visitor account was created. */
    created_at: string & tags.Format<"date-time">;

    /** Timestamp when the visitor account was last updated. */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Soft deletion timestamp for removed visitor accounts. Used for
     * account management.
     */
    deleted_at?: (string & tags.Format<"date-time">) | null | undefined;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };
}
