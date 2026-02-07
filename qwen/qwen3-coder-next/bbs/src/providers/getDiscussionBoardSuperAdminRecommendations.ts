import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminRecommendations(props: {
  superAdmin: SuperadminPayload;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const page = 1; // Default page
  const limit = 10; // Default limit
  const skip = (page - 1) * limit;
  // Retrieve articles sorted by view_count (popularity) and created_at (recency)
  const data = await MyGlobal.prisma.discussion_board_articles.findMany({
    where: {
      deleted_at: null,
    },
    skip,
    take: limit,
    orderBy: [{ view_count: "desc" }, { created_at: "desc" }],
  });
  // Count total records for pagination
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where: {
      deleted_at: null,
    },
  });
  // Transform database records to response DTO format
  const transformedData: IDiscussionBoardArticle.ISummary[] = data.map(
    (record) => ({
      // Transform fields based on database schema
      id: record.id as string & tags.Format<"uuid">,
      title: record.title,
      content: record.content,
      view_count: record.view_count,
      created_at: toISOStringSafe(record.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(record.updated_at) as string &
        tags.Format<"date-time">,
    }),
  );
  // Build pagination response
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
