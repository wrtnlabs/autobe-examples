import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformPopular(): Promise<IPageIRedditPlatformPost.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.reddit_platform_post_view_stats.findMany({
    where: {
      deleted_at: null,
    },
    skip,
    take: limit,
    orderBy: { hot_score: "desc" },
    select: {
      reddit_platform_post_id: true,
      hot_score: true,
      vote_score: true,
      comment_count: true,
      view_count: true,
    },
  });
  const total = await MyGlobal.prisma.reddit_platform_post_view_stats.count({
    where: {
      deleted_at: null,
    },
  });
  return {
    data: data.map((item) => ({
      id: item.reddit_platform_post_id as string & tags.Format<"uuid">,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
