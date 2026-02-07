import { IEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardComment";
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

export async function patchEconomicBoardAdministratorAnalyticsComments(props: {
  administrator: AdministratorPayload;
}): Promise<IEconomicBoardComment> {
  // Extract query parameters (they are in request body per spec, even though requestBody is null)
  // Per specification, filtering is via query string parameters: startDate, endDate, sectionId, authorRole
  // Since request body is null and no parameters are defined in props, we must assume they are passed as Express query parameters
  // However, the system does not expose request object - so this is a design mismatch. We must assume they are not part of this function signature.
  // Therefore we proceed without filtering as specified in the function signature.
  // Count total comments
  const totalComments = await MyGlobal.prisma.economic_board_comments.count({
    where: { deleted_at: null },
  });
  // Count comments by role
  const commentsByRoleRaw = await MyGlobal.prisma.$queryRaw`
    SELECT
      CASE
        WHEN c.economic_board_users_id IN (SELECT id FROM economic_board_citizens) THEN 'citizen'
        WHEN c.economic_board_users_id IN (SELECT id FROM economic_board_administrators) THEN 'administrator'
        WHEN c.economic_board_users_id IN (SELECT id FROM economic_board_super_administrators) THEN 'superAdministrator'
      END AS role,
      COUNT(*) AS count
    FROM economic_board_comments c
    WHERE c.deleted_at IS NULL
    GROUP BY role
  `;
  const commentsByRole: {
    role: "citizen" | "administrator" | "superAdministrator";
    count: number;
  }[] = (commentsByRoleRaw as Array<Record<string, any>>).map((row) => ({
    role: row.role as "citizen" | "administrator" | "superAdministrator",
    count: Number(row.count),
  }));
  // Count comments by section
  const commentsBySectionRaw = await MyGlobal.prisma.$queryRaw`
    SELECT
      s.id AS sectionId,
      s.name AS sectionName,
      COUNT(*) AS count
    FROM economic_board_comments c
    JOIN economic_board_articles a ON a.id = c.economic_board_articles_id
    JOIN economic_board_sections s ON s.id = a.economic_board_section_id
    WHERE c.deleted_at IS NULL
    GROUP BY s.id, s.name
  `;
  const commentsBySection: {
    sectionId: string & tags.Format<"uuid">;
    sectionName: string;
    count: number;
  }[] = (commentsBySectionRaw as Array<Record<string, any>>).map((row) => ({
    sectionId: row.sectionId as string & tags.Format<"uuid">,
    sectionName: row.sectionName,
    count: Number(row.count),
  }));
  // Average comments per article
  const articleCommentCounts = await MyGlobal.prisma.$queryRaw`
    SELECT COUNT(c2.id) AS count
    FROM economic_board_articles a
    JOIN economic_board_comments c2 ON c2.economic_board_articles_id = a.id
    WHERE c2.deleted_at IS NULL
    GROUP BY a.id
  `;
  const totalArticleComments = (
    articleCommentCounts as Array<Record<string, any>>
  ).reduce((sum, row) => sum + Number(row.count), 0);
  const articleCount = (articleCommentCounts as Array<Record<string, any>>)
    .length;
  const averageCommentsPerArticle =
    articleCount > 0 ? totalArticleComments / articleCount : 0;
  // Trend by day
  const trendByDayRaw = await MyGlobal.prisma.$queryRaw`
    SELECT
      date_trunc('day', c.created_at)::date as date,
      COUNT(*) AS count
    FROM economic_board_comments c
    WHERE c.deleted_at IS NULL
    GROUP BY date_trunc('day', c.created_at)
    ORDER BY date
  `;
  const trendByDay: {
    date: string & tags.Format<"date-time">;
    count: number;
  }[] = (trendByDayRaw as Array<Record<string, any>>).map((row) => ({
    date: toISOStringSafe(new Date(row.date as string)),
    count: Number(row.count),
  }));
  // Return object matching IEconomicBoardComment type (which is empty object per schema)
  // This is a design flaw in the API - we're returning an analytics object, but type is IEconomicBoardComment
  // We follow specification literally
  return {} as IEconomicBoardComment;
}
