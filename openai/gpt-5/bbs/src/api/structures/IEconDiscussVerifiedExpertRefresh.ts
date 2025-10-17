import { tags } from "typia";

export namespace IEconDiscussVerifiedExpertRefresh {
  /**
   * Verified Expert token refresh request DTO.
   *
   * Consumes a valid refresh token and returns a new
   * IEconDiscussVerifiedExpert.IAuthorized payload with rotated credentials.
   * Stateless with respect to the Prisma schema (no token persistence columns
   * exist).
   */
  export type ICreate = {
    /**
     * Long-lived refresh token presented for rotation and issuance of a new
     * access token.
     *
     * Transported via secure channel (e.g., HTTP-only cookie or
     * authorization header per policy). Not stored in Prisma tables
     * described; rotation/revocation handled by the token service.
     */
    refresh_token: string & tags.MinLength<20>;
  };
}
