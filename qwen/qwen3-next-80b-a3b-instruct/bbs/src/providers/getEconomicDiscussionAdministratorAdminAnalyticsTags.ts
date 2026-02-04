import { IEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionArticleTag";
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

export async function getEconomicDiscussionAdministratorAdminAnalyticsTags(props: {
  administrator: AdministratorPayload;
}): Promise<IPageIEconomicDiscussionArticleTag> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  // Execute raw SQL query for aggregation with proper GROUP BY
  const result = await MyGlobal.prisma.$queryRaw<
    {
      tag: string;
      count: number;
      lastUsed: Date;
    }[]
  >`
    SELECT 
      tag, 
      COUNT(*) as count, 
      MAX(created_at) as lastUsed
    FROM economic_discussion_article_tags
    WHERE tag IS NOT NULL AND tag != ''
    GROUP BY tag
    ORDER BY count DESC, tag ASC
    LIMIT ${limit} OFFSET ${skip}
  `;
  // Count total unique tags
  const total = await MyGlobal.prisma.$queryRaw<
    {
      count: number;
    }[]
  >`
    SELECT COUNT(*) as count
    FROM (
      SELECT tag
      FROM economic_discussion_article_tags
      WHERE tag IS NOT NULL AND tag != ''
      GROUP BY tag
    ) as unique_tags
  `;
  const summaryData = result.map((item) => ({
    tag: item.tag,
    count: item.count,
    lastUsed: toISOStringSafe(item.lastUsed),
  }));
  return {
    pagination: {
      current: page,
      limit,
      records: total[0].count,
      pages: Math.ceil(total[0].count / limit),
    },
    data: summaryData,
  };
}
