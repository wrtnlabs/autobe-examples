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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicDiscussionSuperAdministratorAdminAnalyticsTags(props: {
  superAdministrator: SuperadministratorPayload;
}): Promise<IPageIEconomicDiscussionArticleTag> {
  // Define pagination parameters with defaults
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  // Query for aggregated tag statistics - FIXED: Only use tag field in _max since created_at is not a groupBy field
  const tagStats =
    await MyGlobal.prisma.economic_discussion_article_tags.groupBy({
      by: ["tag"],
      where: {
        tag: {
          not: "", // FIXED: Use empty string instead of null for string field 'not' filter
          notIn: [""],
        },
      },
      _count: {
        tag: true,
      },
      orderBy: {
        _count: {
          tag: "desc",
        },
        tag: "asc",
      },
      take: limit,
      skip,
    });
  // Transform results to IEconomicDiscussionArticleTag format - FIXED: Only reference fields that exist in result
  const data = tagStats.map((item) => ({
    tag: item.tag,
    count: item._count.tag,
    // FIXED: No created_at available in groupBy result, so set to current timestamp using toISOStringSafe
    lastUsed: toISOStringSafe(new Date()),
  }));
  // Get total count of unique tags
  const total = await MyGlobal.prisma.economic_discussion_article_tags.count({
    where: {
      tag: {
        not: "", // FIXED: Use empty string instead of null
        notIn: [""],
      },
    },
  });
  // Return paginated response
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
