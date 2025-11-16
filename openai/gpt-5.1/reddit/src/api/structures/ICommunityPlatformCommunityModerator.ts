import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";
import { ICommunityPlatformAccountStatus } from "./ICommunityPlatformAccountStatus";

export namespace ICommunityPlatformCommunityModerator {
  /**
   * Registration payload for creating a new community moderator account.
   *
   * This DTO is used by the public join endpoint for the communityModerator
   * actor. It accepts the initial credentials and basic profile data required
   * to insert a new row into community_platform_communitymoderators and
   * create a corresponding authenticated moderator session.
   *
   * The password field is provided in plain text and will be hashed
   * server-side before being stored in the password_hash column. Actor
   * identity, session identifiers, and account status bookkeeping are handled
   * exclusively on the server and are not accepted from the client.
   */
  export type IJoin = {
    /**
     * Desired globally unique username for the community moderator account.
     *
     * Must satisfy platform-level validation rules (such as length and
     * allowed characters) and must not collide with existing usernames in
     * community_platform_communitymoderators.
     */
    username: string;

    /**
     * Email address associated with the new moderator account.
     *
     * Used both for login and for notifications. Must be unique across
     * community_platform_communitymoderators according to the underlying
     * unique index.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain-text password chosen by the moderator during registration.
     *
     * The backend hashes this value with a secure one-way algorithm and
     * stores only the resulting hash in
     * community_platform_communitymoderators.password_hash. The raw
     * password is never persisted.
     */
    password: string;

    /**
     * Optional human-readable display name for the community moderator
     * shown in UI contexts.
     *
     * If omitted or null, clients typically fall back to showing the
     * username.
     */
    display_name?: string | null | undefined;

    /**
     * Optional client IP address associated with the registration request.
     *
     * When provided, it is stored in
     * community_platform_communitymoderator_sessions.ip to support security
     * analytics and auditing. If omitted or null, the backend may infer the
     * IP from the transport layer or leave the session ip column null
     * depending on deployment and logging strategy.
     */
    ip?: string | null | undefined;

    /**
     * Full URL of the page from which the registration request was
     * initiated.
     *
     * Persisted into community_platform_communitymoderator_sessions.href to
     * provide contextual information for security analytics and auditing.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL that led the user to the registration page.
     *
     * Stored in community_platform_communitymoderator_sessions.referrer to
     * support investigation of suspicious registration patterns and traffic
     * sources.
     */
    referrer: string & tags.Format<"uri">;
  };

  /**
   * Authorized community moderator context returned after successful join,
   * login, or token refresh.
   *
   * Contains the moderator's identifier and the issued JWT token bundle that
   * will be used for authenticated moderator operations. This DTO is
   * security-sensitive and must never expose password or hash fields.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated community moderator actor.
     *
     * This value corresponds to the primary key of the moderator record in
     * the community_platform_communitymoderators table.
     */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Login credentials and session context for authenticating a community
   * moderator.
   *
   * The client supplies an identifier (either username or email), the
   * plain-text password, and optional session metadata such as href and
   * referrer. The backend verifies the credentials against the
   * community_platform_communitymoderators table and records a new session in
   * community_platform_communitymoderator_sessions using the provided context
   * when available.
   */
  export type ILogin = {
    /**
     * Login identifier for the community moderator account.
     *
     * Can be either the username or email registered in the
     * community_platform_communitymoderators table. The backend determines
     * how to resolve this identifier.
     */
    identifier: string;

    /**
     * Plain-text password for the community moderator account.
     *
     * The backend hashes this value and compares it to the stored
     * password_hash column in community_platform_communitymoderators. The
     * raw password is never persisted.
     */
    password: string;

    /**
     * Client IP address information for the login context.
     *
     * When provided, this captures where the login attempt originated from.
     * If null, the backend can infer the IP from the underlying HTTP
     * request.
     */
    ip?: string | null | undefined;

    /**
     * Current page URL (connection URL) from which the login is initiated.
     *
     * This value is stored in
     * community_platform_communitymoderator_sessions to capture the context
     * of the session establishment. For non-browser clients that do not
     * have a meaningful page URL, this field can be omitted from the
     * request body.
     */
    href?: (string & tags.Format<"uri">) | undefined;

    /**
     * Referrer URL of the page that led to the current login page.
     *
     * Used for security analytics and stored in
     * community_platform_communitymoderator_sessions and related security
     * event logs. For clients without a traditional referrer concept, this
     * field can be omitted from the request body.
     */
    referrer?: (string & tags.Format<"uri">) | undefined;
  };

  /**
   * Request body for refreshing JWT tokens for an authenticated community
   * moderator using a refresh token bound to an existing active session.
   */
  export type IRefresh = {
    /**
     * Opaque refresh token issued during a previous authentication flow for
     * the community moderator. This token is validated and exchanged for
     * new JWT access and refresh tokens.
     */
    refreshToken: string;
  };

  /**
   * Request DTO for searching and filtering community moderator accounts
   * across the platform.
   *
   * This schema encapsulates complex search criteria and pagination options
   * used by administrative tools to retrieve a filtered, paginated list of
   * moderators from the `community_platform_communitymoderators` table. It is
   * consumed by the PATCH
   * `/communityPlatform/platformAdmin/communityModerators` endpoint.
   *
   * The filters focus on moderator identity, associated account status, and
   * temporal windows, while pagination controls determine how result pages
   * are sliced. It intentionally does not expose any credential-related
   * fields and is designed purely for query purposes, so it does not carry
   * the `x-autobe-prisma-schema` link because it does not map 1:1 to a single
   * Prisma model row.
   */
  export type IRequest = {
    /**
     * Zero-based page index for paginated moderator search results.
     *
     * Clients use this field together with `limit` to navigate through
     * large moderator datasets. A value of `0` represents the first page,
     * `1` the second, and so on.
     *
     * If omitted, the backend should default to the first page. Negative
     * values are invalid and should be rejected at validation time.
     */
    page?: (number & tags.Type<"int32">) | undefined;

    /**
     * Maximum number of moderator records to return in a single page of
     * search results.
     *
     * This value controls page size for the paginated response produced by
     * the PATCH `/communityPlatform/platformAdmin/communityModerators`
     * endpoint. Implementations should enforce reasonable upper bounds to
     * protect performance and avoid excessively large responses.
     *
     * If omitted, the backend should apply a sensible default limit. Values
     * less than or equal to zero are invalid and should be rejected.
     */
    limit?: (number & tags.Type<"int32">) | undefined;

    /**
     * Optional filter for the moderator's unique username stored in
     * `community_platform_communitymoderators.username`.
     *
     * When provided, this value is typically matched using exact comparison
     * or a case-insensitive search, depending on platform policy. It allows
     * administrators to quickly locate a specific moderator account by
     * username.
     *
     * Empty strings should be treated as not provided rather than a valid
     * filter value.
     */
    username?: string | undefined;

    /**
     * Optional filter for the moderator's unique email address stored in
     * `community_platform_communitymoderators.email`.
     *
     * This field is used to search for moderator accounts by login or
     * contact email. Implementations commonly apply case-insensitive
     * matching and may support partial matches where appropriate.
     *
     * The value must be a syntactically valid email address when used as an
     * exact filter; otherwise validation should report an error.
     */
    email?: string | undefined;

    /**
     * Optional filter for the human-friendly display name of the moderator
     * as stored in `community_platform_communitymoderators.display_name`.
     *
     * This filter is helpful when administrators only know the
     * public-facing name of the moderator. Implementations may apply
     * partial or case-insensitive matching to support flexible search
     * behaviour.
     *
     * Because `display_name` is nullable in the underlying table,
     * moderators without any display name are not matched unless the
     * implementation explicitly supports a "missing display name" filter
     * pattern.
     */
    display_name?: string | undefined;

    /**
     * Optional filter for the current account status of the moderator,
     * referencing `community_platform_account_statuses.id`.
     *
     * When provided, the query restricts results to moderators whose
     * `account_status_id` matches this UUID. This allows administrators to
     * list moderators in specific lifecycle states such as active,
     * suspended, or banned, depending on which status records exist in the
     * status lookup table.
     *
     * If omitted, moderators of all statuses are eligible to be returned,
     * subject to other filters.
     */
    account_status_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Optional lower bound (inclusive) of the moderator account creation
     * timestamp window, corresponding to
     * `community_platform_communitymoderators.created_at`.
     *
     * When set, only moderators with `created_at` greater than or equal to
     * this timestamp are included in the result set. This helps
     * administrators focus on newly created or recently added moderators.
     *
     * The value must be an ISO 8601 date-time string in UTC or a clearly
     * specified timezone.
     */
    created_from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Optional upper bound (inclusive) of the moderator account creation
     * timestamp window, corresponding to
     * `community_platform_communitymoderators.created_at`.
     *
     * When set, only moderators with `created_at` less than or equal to
     * this timestamp are returned. Used together with `created_from`, this
     * field enables administrators to constrain results to a specific
     * creation date interval.
     *
     * The value must be an ISO 8601 date-time string. If it is earlier than
     * `created_from`, the combination should be considered invalid.
     */
    created_to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Flag indicating whether logically deleted moderator accounts (with
     * non-null `deleted_at` in `community_platform_communitymoderators`)
     * should be included in search results.
     *
     * By default, administrative search operations typically exclude
     * soft-deleted records to focus on active accounts. Setting this flag
     * to true instructs the backend to include those logically deleted
     * moderators, which is particularly useful for audit investigations and
     * historical reviews.
     *
     * Client applications should surface this option only in privileged or
     * audit-specific views because deleted accounts may contain sensitive
     * historical information.
     */
    include_deleted?: boolean | undefined;
  };

  /**
   * Summary DTO for a community moderator actor.
   *
   * Represents a user identity that can hold moderator privileges in one or
   * more communities. This summary is used wherever a moderator needs to be
   * referenced without including full security or account details.
   *
   * Additionally, this summary exposes the moderator's current account status
   * and key lifecycle metadata so that administrative UIs can understand
   * whether the moderator is active, suspended, or otherwise restricted, and
   * when the account was created or last updated, without issuing additional
   * lookups.
   *
   * The DTO is intentionally credential-safe: it never includes password
   * hashes, raw credentials, or other sensitive secrets, and instead focuses
   * on identity, status, and high-level lifecycle state derived from the
   * `community_platform_communitymoderators` Prisma model.
   */
  export type ISummary = {
    /**
     * Unique identifier of the community moderator actor.
     *
     * This value maps directly to
     * `community_platform_communitymoderators.id` and is the primary key
     * used throughout the platform to reference this moderator identity in
     * joins, foreign keys, and API paths.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Public-facing username or handle associated with this moderator
     * identity.
     *
     * The username is stored in
     * `community_platform_communitymoderators.username` and is typically
     * unique across all moderator accounts. It is used in administrative
     * tools and, where appropriate, in end-user UIs to refer to the
     * moderator.
     *
     * Platform policies may enforce normalization rules (such as lowercase
     * only or restricted character sets), but those are enforced at the
     * service layer and not encoded in this schema.
     */
    username: string & tags.MinLength<1>;

    /**
     * Primary email address associated with the community moderator
     * account.
     *
     * This value maps directly to
     * `community_platform_communitymoderators.email` and serves both as a
     * login identifier for authentication workflows and as a destination
     * for moderator-facing notifications such as security alerts or
     * moderation updates.
     *
     * The email address is expected to be unique among moderator accounts
     * according to database constraints. Implementations should validate
     * format and business policies (for example, allowed domains) before
     * persisting changes, but the DTO itself only enforces a standard email
     * format.
     */
    email: string & tags.Format<"email">;

    /**
     * Optional display name for the moderator, shown in UIs instead of the
     * username when present.
     *
     * This is a direct projection of
     * `community_platform_communitymoderators.display_name`. When null or
     * absent, UIs should fall back to the `username` or another canonical
     * identity field for display.
     */
    display_name?: string | null | undefined;

    /**
     * Optional profile avatar image URL for this moderator identity.
     *
     * This field represents a resolved URL reference used for UI
     * presentation and does not correspond directly to a column on
     * `community_platform_communitymoderators`. When null or omitted,
     * clients should fall back to a default avatar representation. File
     * uploads are handled by separate infrastructure, and this DTO only
     * ever carries a URL reference.
     */
    avatar_url?: (string & tags.Format<"uri">) | null | undefined;

    /**
     * Current account status of the community moderator expressed as a
     * master-data association.
     *
     * This object is derived from the `community_platform_account_statuses`
     * row referenced by
     * `community_platform_communitymoderators.account_status_id` and
     * rendered using the `ICommunityPlatformAccountStatus.ISummary` DTO. It
     * enables administrative UIs to understand whether the moderator is
     * active, suspended, banned, or otherwise restricted without issuing
     * separate lookups.
     *
     * Because the foreign key is non-nullable at the database level, this
     * association is expected to be present for all valid moderator records
     * returned by this summary DTO.
     */
    account_status: ICommunityPlatformAccountStatus.ISummary;

    /**
     * Timestamp indicating when the community moderator account was
     * originally created.
     *
     * This value maps directly to
     * `community_platform_communitymoderators.created_at` and is typically
     * set automatically by the database or ORM at insert time. It is
     * expressed in ISO 8601 date-time format (UTC or a clearly documented
     * timezone) so that clients can display the account age and sort
     * moderators by creation time.
     *
     * Administrative and audit UIs use this field to understand how long a
     * moderator account has existed and to analyze account lifecycle
     * patterns across the platform.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp of the most recent update applied to the community
     * moderator account.
     *
     * This field is mapped from
     * `community_platform_communitymoderators.updated_at` and is
     * automatically updated whenever mutable fields on the moderator record
     * (such as `username`, `email`, `display_name`, or `account_status_id`)
     * are changed. The value is represented in ISO 8601 date-time format.
     *
     * Administrative tools and audit dashboards use this timestamp to
     * identify recently modified moderator accounts, support
     * troubleshooting, and correlate changes with audit-log entries in
     * tables such as `community_platform_audit_logs` or
     * `community_platform_moderation_audit_logs`.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Indicates whether this community moderator account has been logically
     * deleted.
     *
     * This flag is derived from the nullable
     * `community_platform_communitymoderators.deleted_at` column: when
     * `deleted_at` is non-null, `is_deleted` is `true`; when `deleted_at`
     * is null, `is_deleted` is `false`. Logical deletion prevents further
     * use of the account in normal flows while retaining the record for
     * audit and historical reference.
     *
     * Client applications and administrative UIs can use this flag to
     * visually distinguish active moderators from those that have been
     * deactivated or removed, without needing direct access to the raw
     * `deleted_at` timestamp or implementing custom derivation logic in
     * each consumer.
     */
    is_deleted: boolean;
  };

  /**
   * Mutable, non-credential update payload for a community moderator actor
   * stored in the `community_platform_communitymoderators` table.
   *
   * This DTO is used by privileged administrative operations to adjust
   * moderator-facing identity and status fields such as `username`, `email`,
   * `display_name`, or the linked `account_status_id` without ever exposing
   * or accepting credential material like `password_hash`.
   *
   * All properties are optional, following a partial-update semantics where
   * only provided fields are modified. System-managed lifecycle fields such
   * as `id`, `created_at`, and `updated_at` are not writable through this
   * type and must be handled exclusively by the backend implementation and
   * database triggers or ORM logic.
   */
  export type IUpdate = {
    /**
     * New unique username for the community moderator actor.
     *
     * When present, this value replaces the existing `username` in
     * `community_platform_communitymoderators.username`. Implementations
     * must enforce uniqueness across all moderator accounts and apply any
     * platform-specific normalization or validation rules (such as minimum
     * length, allowed characters, and case-sensitivity) before persisting
     * the change.
     */
    username?: string | undefined;

    /**
     * Updated email address for the moderator account used for
     * authentication and notifications.
     *
     * When supplied, this value updates
     * `community_platform_communitymoderators.email`. The backend must
     * ensure uniqueness across all moderator records and validate that the
     * value conforms to standard email format rules. Additional business
     * rules—such as restricting certain domains or requiring
     * verification—should be enforced by the service layer and not by
     * clients.
     */
    email?: (string & tags.Format<"email">) | undefined;

    /**
     * Optional human-friendly display name shown in user interfaces for the
     * moderator identity.
     *
     * If provided as a non-null string, this value updates
     * `community_platform_communitymoderators.display_name`. Supplying
     * `null` explicitly clears the existing display name so that UIs may
     * fall back to using the username or other identity fields. When
     * omitted entirely, this field remains unchanged.
     */
    display_name?: string | null | undefined;

    /**
     * Foreign key reference to the moderator's account status in
     * `community_platform_account_statuses.id`.
     *
     * Administrators may use this field to move a moderator between
     * statuses such as active, suspended, or disabled according to platform
     * policies. Business logic should validate that the referenced status
     * exists and is allowed for moderator actors before applying the
     * change.
     */
    account_status_id?: (string & tags.Format<"uuid">) | undefined;
  };
}
