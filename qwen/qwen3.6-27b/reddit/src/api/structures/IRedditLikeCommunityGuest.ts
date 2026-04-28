import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IRedditLikeCommunityGuest {
  /**
   * Request body for guest join authentication, establishing an ephemeral identity for unauthenticated platform access.
   *
   * Contains the optional device_fingerprint for cross-session continuity - a cryptographic hash derived from browser properties. Includes session context parameters (href, referrer, ip) required for creating the associated guest session record with proper client tracking.
   */
  export type IJoin = {
    /**
         * @x-autobe-database-schema-property device_fingerprint
         * @x-autobe-specification Optional cryptographic hash identifying the
         *   guest across sessions. Derived from browser properties. Enables
         *   guest identity continuity without authentication. Nullable because
         *   guests may not have a fingerprint or it may be unavailable.
     */
    device_fingerprint?: string | null | undefined;
    href: string & tags.Format<"uri">;
    referrer: string & tags.Format<"uri">;
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };

  /**
   * Guest session refresh request containing updated session context for renewing authentication.
   *
   * This request body provides the current session context — the URL endpoint the guest is browsing, the arrival referrer, and optionally the client IP address. These values are stored in the new guest session record created upon successful refresh, enabling the system to track where the guest is browsing from.
   *
   * The actual refresh token for identity verification is provided in the authorization header, not in the request body. The guest identity (guest account linkage) is resolved from the JWT token as well.
   */
  export type IRefresh = {
    /**
     * Refresh token used to renew the guest's authentication session.
     *
     * This token is required to validate the current active session. Upon successful validation, a new guest session with a fresh expiration is created and new JWT tokens are issued.
     *
         * @x-autobe-specification The long-lived refresh token taken from the
         *   Authorization header. Validated against active guest sessions.
     */
    refresh: string;
  };

  /**
   * Authorization response granting an unauthenticated guest read-only access to public platform content.
   *
   * Returned upon successful guest join or session refresh, this response includes the guest's unique identifier and a token object containing JWT credentials needed to authenticate subsequent API requests. Guests with valid tokens can browse the popular feed, community feeds, all community listings, user profiles, posts, and comments.
   *
   * The token object contains an access token for immediate API access, a refresh token for session renewal, and expiration timestamps indicating when credentials expire.
   */
  export type IAuthorized = {
    /**
     * The unique identifier of the guest account.
     *
     * This UUID identifies the ephemeral guest identity created during the join operation. It remains stable across session refreshes and is used to associate guest activity with this unauthenticated account. Unlike registered members, guests do not have usernames or email addresses — this id is their sole identifier on the platform.
     *
         * @x-autobe-database-schema-property id
         * @x-autobe-specification Direct mapping from
         *   reddit_like_community_guests.id. UUID primary key serving as the
         *   guest's unique platform identity. This identifier is stable across
         *   session refreshes and remains constant for the lifetime of the
         *   guest account.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Authorization token.
     *
         * @x-autobe-specification Authorization token comes from the session
         *   table.
     */
    token: IAuthorizationToken;
  };
}
