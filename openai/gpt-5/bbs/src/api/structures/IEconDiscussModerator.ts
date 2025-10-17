import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IEconDiscussModerator {
  /**
   * Moderator registration payload.
   *
   * On success, the server will:
   *
   * - Create Actors.econ_discuss_users with email, password_hash (derived from
   *   password), display_name, optional timezone/locale/avatar_uri, and
   *   defaults for email_verified=false, mfa_enabled=false, mfa_secret=null,
   *   mfa_recovery_codes=null
   * - Create Actors.econ_discuss_moderators with user_id and enforced_2fa=true
   *   per policy
   *
   * Security:
   *
   * - Do not accept system-managed fields like
   *   id/created_at/updated_at/enforced_2fa
   * - Hash the password before persistence
   * - Enforce email uniqueness and strong password policy
   */
  export type ICreate = {
    /**
     * Moderator’s login email address.
     *
     * Prisma mapping: econ_discuss_users.email (unique). The server ensures
     * uniqueness and normalization (e.g., lowercase) at the application
     * layer.
     */
    email: string & tags.Format<"email">;

    /**
     * Plaintext password to be hashed server-side before persistence.
     *
     * Prisma mapping: econ_discuss_users.password_hash (derived). Never
     * store or echo plaintext.
     */
    password: string & tags.MinLength<8>;

    /**
     * Public display name/handle for the moderator.
     *
     * Prisma mapping: econ_discuss_users.display_name. Indexed for
     * discovery via trigram according to schema comments.
     */
    display_name: string & tags.MinLength<1> & tags.MaxLength<120>;

    /**
     * Optional IANA timezone identifier used for notifications and
     * scheduling.
     *
     * Prisma mapping: econ_discuss_users.timezone. Example: "Asia/Seoul"
     */
    timezone?: string | undefined;

    /**
     * Optional UI locale/language tag (BCP 47).
     *
     * Prisma mapping: econ_discuss_users.locale. Example: "en-US"
     */
    locale?: string | undefined;

    /**
     * Optional avatar image URI for the profile.
     *
     * Prisma mapping: econ_discuss_users.avatar_uri (varchar). Validate
     * format and reasonable length per application policy.
     */
    avatar_uri?: (string & tags.Format<"uri">) | undefined;
  };

  /**
   * Authorization response for a Moderator session.
   *
   * This DTO represents the authenticated principal after successful
   * moderator login/join/refresh. It intentionally excludes sensitive fields
   * like password_hash, mfa_secret, and mfa_recovery_codes. The id maps to
   * econ_discuss_users.id and the role is inferred from the presence of a
   * linked row in Actors.econ_discuss_moderators.
   *
   * Security notes: Never include secrets or recovery codes. JWT material is
   * provided via the IAuthorizationToken reference. Timestamps
   * (created_at/updated_at) and internal flags may be omitted from this
   * surface unless business requirements explicitly need them.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated user (econ_discuss_users.id).
     *
     * Prisma reference: Actors.econ_discuss_users.id — Primary key for the
     * platform account record representing the moderator identity.
     */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;

    /**
     * Client-facing role indicator for the current authorization context.
     *
     * Derived from Actors.econ_discuss_moderators (presence of a row linked
     * by user_id).
     */
    role?: "moderator" | undefined;

    /**
     * Publicly visible handle from econ_discuss_users.display_name.
     *
     * Prisma reference: Actors.econ_discuss_users.display_name —
     * Human‑readable display name.
     */
    display_name?: string | undefined;

    /**
     * Whether the user’s email is verified
     * (econ_discuss_users.email_verified).
     *
     * Prisma reference: Actors.econ_discuss_users.email_verified — Boolean
     * flag toggled by separate verification flow.
     */
    email_verified?: boolean | undefined;

    /**
     * Whether multi‑factor authentication is enabled
     * (econ_discuss_users.mfa_enabled).
     *
     * Prisma reference: Actors.econ_discuss_users.mfa_enabled — Indicates
     * if the account has successfully completed MFA setup.
     */
    mfa_enabled?: boolean | undefined;

    /**
     * Preferred IANA timezone identifier used for notifications and
     * scheduling (econ_discuss_users.timezone).
     *
     * Prisma reference: Actors.econ_discuss_users.timezone — Nullable text
     * field; example: "Asia/Seoul".
     */
    timezone?: string | null | undefined;

    /**
     * Preferred BCP‑47 locale tag for UI (econ_discuss_users.locale).
     *
     * Prisma reference: Actors.econ_discuss_users.locale — Nullable;
     * example: "en-US".
     */
    locale?: string | null | undefined;

    /**
     * Optional avatar image URI (econ_discuss_users.avatar_uri).
     *
     * Prisma reference: Actors.econ_discuss_users.avatar_uri — Nullable
     * VarChar; URI format recommended at the application layer.
     */
    avatar_uri?: (string & tags.Format<"uri">) | null | undefined;
  };

  /**
   * Moderator login request payload.
   *
   * Per Auth DTO rules, this request contains only email and password. If
   * policy requires MFA, the platform performs a separate MFA verification
   * step/endpoint after primary credential validation using MFA artifacts
   * stored in econ_discuss_users (mfa_enabled, mfa_secret,
   * mfa_recovery_codes).
   */
  export type ILogin = {
    /**
     * User’s login email (econ_discuss_users.email).
     *
     * Prisma reference: Actors.econ_discuss_users.email — Unique email used
     * for authentication and notifications.
     */
    email: string & tags.Format<"email">;

    /**
     * Plaintext password to be verified and hashed server‑side against
     * econ_discuss_users.password_hash.
     *
     * Prisma reference: Actors.econ_discuss_users.password_hash — Stored
     * hash; plaintext is never persisted.
     */
    password: string & tags.MinLength<8>;
  };

  /**
   * Moderator token refresh request.
   *
   * Consumes a refresh token and returns a new authorized session upon
   * success. The service may revalidate role presence via
   * Actors.econ_discuss_moderators before issuing tokens.
   */
  export type IRefresh = {
    /**
     * Refresh token presented for rotation/renewal.
     *
     * Business note: Token validation/rotation is handled by the auth
     * layer; Prisma schema does not persist tokens.
     */
    refresh_token: string;
  };
}
