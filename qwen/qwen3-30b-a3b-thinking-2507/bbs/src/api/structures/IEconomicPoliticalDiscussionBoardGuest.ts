import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";
import { IEconomicPoliticalDiscussionBoardUser } from "./IEconomicPoliticalDiscussionBoardUser";

export namespace IEconomicPoliticalDiscussionBoardGuest {
  /**
   * Registration information required for new guest account, containing validated email and password for public registration process.
   */
  export type IJoin = {
    /**
     * The email address for guest registration (validated format, unique) used to associate with verification tokens.
     *
     * @x-autobe-specification Maps email from request to user_email_verifications table for verification tokens. Validates email format (using 'email' format in Prisma).
     */
    email: string & tags.Format<"email">;

    /**
     * The password for guest account (must meet complexity: 8+ characters, at least one uppercase letter)
     *
     * @x-autobe-specification Maps password from request to user_email_verifications table, validates complexity (8+ characters, 1 uppercase letter). Password is stored hashed.
     */
    password: string & tags.MinLength<8> & tags.Pattern<"^(?=.*[A-Z]).{8,}$">;
  };

  /**
   * Request body containing guest session refresh token (valid for 7 days).
   */
  export type IRefresh = {
    /**
     * Guest session refresh token
     *
     * @x-autobe-specification Validates refresh token against guest sessions records, checking 7-day expiration and active session state before generating new tokens.
     */
    refreshToken: string & tags.Format<"uuid">;
  };

  /**
   * Guest authentication response including unique account identifier and JWT session tokens for public content access. Contains standard authorization token structure with expiration metadata.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the guest account, used for session tracking and access control.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from guest accounts primary key id column
     */
    id: string & tags.Format<"uuid">;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Ban record details including banned user, ban reason, applied admin, and status timestamps. All audit information visible to administrators.
   */
  export type IBan = {
    /**
     * Unique identifier for this ban record
     *
     * @x-autobe-specification PK of economic_political_discussion_board_bans table
     * @x-autobe-database-schema-property id
     */
    id: string & tags.Format<"uuid">;

    /**
     * Detail information about the banned user
     *
     * @x-autobe-specification Join to users using economic_political_discussion_board_bans.user_id
     * @x-autobe-database-schema-property bannedUser
     */
    bannedUser: IEconomicPoliticalDiscussionBoardUser.ISummary;

    /**
     * Detail information about the administrator who applied the ban
     *
     * @x-autobe-specification Join to users using economic_political_discussion_board_bans.admin_user_id
     * @x-autobe-database-schema-property appliedBy
     */
    appliedBy: IEconomicPoliticalDiscussionBoardUser.ISummary;

    /**
     * Reason for banning the user
     *
     * @x-autobe-database-schema-property reason
     * @x-autobe-specification Ban reason field from database
     */
    banReason: string;

    /**
     * Current ban status: active, expired, or revoked
     *
     * @x-autobe-specification Computed status: active (active=true, deleted_at=null), expired (active=false, deleted_at!null), revoked (manual action)
     */
    status: "active" | "expired" | "revoked";

    /**
     * Timestamp when the ban was created
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Creation timestamp from database
     */
    createdAt: string & tags.Format<"date-time">;

    /**
     * Timestamp when ban expired (soft-deleted), or null if active
     *
     * @x-autobe-database-schema-property deleted_at
     * @x-autobe-specification Expiration timestamp tracked via soft delete in deleted_at
     */
    expiredAt: (string & tags.Format<"date-time">) | null;
  };
}
