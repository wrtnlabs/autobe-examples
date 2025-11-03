import { tags } from "typia";

export namespace ICivicBoardAdminRefresh {
  /**
   * Request DTO to refresh administrator authorization without re‑entering
   * credentials. This operation does not write to any Prisma model directly;
   * it validates the provided refresh token and, on success, issues new
   * authorization material. Audit and analytics may reference
   * civic_board_admin_sessions (id, civic_board_admin_id, ip, href, referrer,
   * created_at, expired_at) but those identifiers are never supplied by
   * clients in this body.
   */
  export type ICreate = {
    /**
     * Opaque refresh token presented by the administrator to obtain new
     * access/refresh credentials. Although no corresponding column exists
     * in the Prisma schema, this value is verified server‑side against the
     * active session and token subsystem associated with
     * civic_board_admin_sessions for audit context. Do not include session
     * context fields (ip, href, referrer) here; refresh reuses the
     * established session per security rules.
     */
    refresh_token: string & tags.MinLength<1>;
  };
}
