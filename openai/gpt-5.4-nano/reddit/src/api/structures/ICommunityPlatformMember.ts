import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ICommunityPlatformMember {
  /**
   * Authorization response for an authenticated member. Returns the authenticated member id and the freshly issued JWT token pair (access + refresh) along with expiration metadata so the client can authenticate requests and refresh tokens when needed.
   */
  export type IAuthorized = {
    /**
     * Authenticated member account identifier (UUID) associated with the issued token pair.
     *
         * @x-autobe-specification Set id to the authenticated member account
         *   primary key resolved during join/login/refresh. Implementation:
         *   after validating credentials or refresh token, load or resolve the
         *   associated member (or member_id) and return its id as a UUID
         *   string. This value must correspond to the authenticated actor used
         *   for subsequent authorization checks.
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

  /**
   * Request payload for renewing an authenticated member’s authorization using an existing refresh token. Clients send this token to obtain a new access token (and a rotated refresh token) without re-entering credentials.
   */
  export type IRefresh = {
    /**
     * The refresh token used to renew the member’s authentication without re-login.
     *
         * @x-autobe-specification Client-provided refresh token string. Backend
         *   must treat it as the lookup key for the associated member
         *   session/refresh token record. Validate expiration/rotation state,
         *   reject invalid/expired/revoked tokens with 401, and upon success
         *   rotate tokens atomically in the member session context before
         *   issuing new authorization tokens.
     */
    refreshToken: string;
  };

  /**
   * A lightweight public summary of a platform member for directory and list views. It exposes the member’s stable identifier and public persona fields (display name, biography, avatar) without any login credentials or sensitive account data.
   */
  export type ISummary = {
    /**
     * The unique identifier of the member. Used to reference the member in other API responses.
     *
         * @x-autobe-database-schema-property id
         * @x-autobe-specification Direct mapping from
         *   community_platform_members.id (UUID). Only members with deleted_at
         *   IS NULL are returned by this DTO’s projection.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The member’s public display name shown in directory and list views.
     *
         * @x-autobe-specification Computed projection: LEFT JOIN
         *   community_platform_user_profiles to fetch the persona display name.
         *   If the joined persona record is missing or does not provide a
         *   value, the service must supply a non-null fallback string to
         *   satisfy the DTO contract (display_name is required and non-null).
     */
    display_name: string;

    /**
     * The member’s public biography text. Null if not set or unavailable.
     *
         * @x-autobe-specification Computed projection: LEFT JOIN
         *   community_platform_user_profiles to fetch the persona biography. If
         *   persona data is missing/unavailable, return null (bio is nullable
         *   in this DTO).
     */
    bio: string | null;

    /**
     * A URI pointing to the member’s avatar image. Null if not set or unavailable.
     *
         * @x-autobe-specification Computed projection: LEFT JOIN
         *   community_platform_user_profiles to fetch the persona avatar URI
         *   reference. If persona data is missing/unavailable, return null
         *   (avatar_uri is nullable in this DTO).
     */
    avatar_uri: (string & tags.Format<"uri">) | null;
  };

  /**
   * Login request payload for authenticated member sign-in. Accepts a credential identifier (email and/or username), a plaintext password, and minimal session/audit context (href/referrer and optional ip) used to create a member session and issue authentication tokens.
   */
  export type ILogin = {
    /**
     * Member email address used as a credential identifier for sign-in.
     *
         * @x-autobe-specification Credential identifier option: when the client
         *   supplies `email`, backend resolves the member account using the
         *   member table email lookup.
     */
    email?: (string & tags.Format<"email">) | undefined;

    /**
     * Member username used as an alternative credential identifier for sign-in.
     *
         * @x-autobe-specification Credential identifier option: when `email` is
         *   not provided (or omitted), backend resolves the member account
         *   using the member identity username lookup as defined by the
         *   platform.
     */
    username?: string | undefined;

    /**
     * Plaintext password used to verify the member's credentials.
     *
         * @x-autobe-specification Security-critical field: treat as plaintext
         *   password provided by the client. Backend verifies it by comparing
         *   with the stored password hash for the resolved member, using
         *   constant-time comparison where applicable. Never store the
         *   plaintext password beyond verification.
     */
    password: string & tags.Format<"password">;

    /**
     * Current page URL (href) used for session/audit context.
     *
         * @x-autobe-specification Session context input: backend persists the
         *   provided href into the created/rotated member session record for
         *   auditing and navigation context.
     */
    href: string & tags.Format<"uri">;

    /**
     * HTTP referrer URL used for session/audit context.
     *
         * @x-autobe-specification Session context input: backend persists the
         *   provided referrer into the created/rotated member session record
         *   for auditing/navigation context.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Optional IPv4 address for session/audit context.
     *
         * @x-autobe-specification Optional IP context input in IPv4 format. If
         *   provided, backend persists it into the created/rotated member
         *   session record; if omitted, backend may use a server-captured IP
         *   fallback depending on deployment.
     */
    ip?: (string & tags.Format<"ipv4">) | null | undefined;
  };

  /**
   * Request payload used to register a new authenticated community member account. The client submits email, username, and a password; the server validates input, stores the member identity with a hashed password, and returns authorization tokens.
   */
  export type IJoin = {
    /**
     * Member email address used for account identity and login.
     *
         * @x-autobe-database-schema-property email
         * @x-autobe-specification Map ICommunityPlatformMember.IJoin.email ->
         *   community_platform_members.email. Validate as an email address and
         *   enforce uniqueness at persistence/service layer (the member table
         *   has a unique index on email).
     */
    email: string & tags.Format<"email">;

    /**
     * Password for the member account. The server will hash and store it securely.
     *
         * @x-autobe-database-schema-property password_hash
         * @x-autobe-specification Map ICommunityPlatformMember.IJoin.password
         *   -> community_platform_members.password_hash by applying a strong
         *   one-way password hashing algorithm in the service layer. Never
         *   accept password_hash from the client and never return password
         *   material.
     */
    password: string & tags.Format<"password">;
  };

  /**
   * Client-provided request body for browsing/searching a paginated list of community platform member accounts. Supports optional free-text search, sorting, and pagination. The server enforces soft-delete filtering for members.
   */
  export type IRequest = {
    /**
     * Optional free-text search term used to filter members by account identity (email) and public profile display name.
     *
         * @x-autobe-specification If provided (non-empty), apply the search
         *   term as a filter over member identity and public persona: match
         *   against community_platform_members.email and the joined
         *   community_platform_user_profiles.display_name. If both are
         *   searched, the exact matching strategy (e.g., substring/ILIKE) is
         *   implementation-defined but must be performed at the database/query
         *   layer before pagination.
     */
    search?: string | undefined;

    /**
     * Selects the primary field used for sorting the member list. 'createdAt' sorts by member creation time; 'displayName' sorts by the member's public profile display name.
     *
         * @x-autobe-specification Controls which field the server uses for
         *   ordering: (1) 'createdAt' => ORDER BY
         *   community_platform_members.created_at; (2) 'displayName' => ORDER
         *   BY community_platform_user_profiles.display_name. When ordering by
         *   displayName, missing/null profile display_name must still produce
         *   deterministic results by falling back to
         *   community_platform_members.created_at.
     */
    sortBy?: "createdAt" | "displayName" | undefined;

    /**
     * Sort direction for the member list. Use 'asc' for ascending order or 'desc' for descending order.
     *
         * @x-autobe-specification Controls the direction of ordering applied to
         *   the selected sortBy key: 'asc' => ascending, 'desc' => descending.
         *   If sortBy is not provided by the client, the server must use its
         *   default sortBy behavior and then apply this direction to that key.
     */
    sortOrder?: "asc" | "desc" | undefined;

    /**
     * 1-indexed page number to return for the paginated member list (must be >= 1).
     *
         * @x-autobe-specification 1-indexed pagination page number. The server
         *   converts (page, limit) into the appropriate offset/limit window for
         *   querying the filtered+sorted member set.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of member records to return for the requested page (must be between 1 and 100).
     *
         * @x-autobe-specification Maximum number of member records to return
         *   per page. The server uses this as the page size when computing the
         *   database query window.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };
}
