import { IEconomicBoardProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicBoardAdministratorMetrics(props: {
  administrator: AdministratorPayload;
}): Promise<IEconomicBoardProfile> {
  try {
    const now = new Date().toISOString() as string & tags.Format<"date-time">;
    const twentyFourHoursAgo = new Date(
      Date.now() - 24 * 60 * 60 * 1000,
    ).toISOString() as string & tags.Format<"date-time">;
    const [
      totalCitizens,
      totalAdministrators,
      totalSuperAdministrators,
      totalArticles,
      totalComments,
      activeCitizenSessions,
      activeAdministratorSessions,
      activeSuperAdministratorSessions,
      sectionCreations24h,
      sectionDeletions24h,
      activeBans,
      pendingAdminRequests,
    ] = await Promise.all([
      MyGlobal.prisma.economic_board_citizens.count({
        where: { deleted_at: null, is_banned: false },
      }),
      MyGlobal.prisma.economic_board_administrators.count({
        where: { deleted_at: null, status: "active" },
      }),
      MyGlobal.prisma.economic_board_super_administrators.count({
        where: { deleted_at: null, status: "active" },
      }),
      MyGlobal.prisma.economic_board_articles.count({
        where: { deleted_at: null },
      }),
      MyGlobal.prisma.economic_board_comments.count({
        where: { deleted_at: null },
      }),
      MyGlobal.prisma.economic_board_citizen_sessions.count({
        where: { expired_at: { gt: now } },
      }),
      MyGlobal.prisma.economic_board_administrator_sessions.count({
        where: { expired_at: { gt: now } },
      }),
      MyGlobal.prisma.economic_board_super_administrator_sessions.count({
        where: { expired_at: { gt: now } },
      }),
      MyGlobal.prisma.economic_board_section_creations.count({
        where: { created_at: { gt: twentyFourHoursAgo } },
      }),
      MyGlobal.prisma.economic_board_section_deletions.count({
        where: { created_at: { gt: twentyFourHoursAgo } },
      }),
      MyGlobal.prisma.economic_board_bans.count({
        where: { unbanned_at: null },
      }),
      MyGlobal.prisma.economic_board_admin_requests.count({
        where: { status: "pending" },
      }),
    ]);
    return {
      totalUsers:
        totalCitizens + totalAdministrators + totalSuperAdministrators,
      totalArticles,
      totalComments,
      activeCitizenSessions,
      activeAdministratorSessions,
      activeSuperAdministratorSessions,
      sectionCreations24h,
      sectionDeletions24h,
      activeBans,
      pendingAdminRequests,
    };
  } catch (error) {
    throw new HttpException("METRICS_FETCH_FAILED", 500);
  }
}
