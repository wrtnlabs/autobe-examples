import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformPostSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPostSummary";
import { IRedditPlatformPostSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSummary";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformHot(): Promise<IPageIRedditPlatformPostSummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.reddit_platform_post_view_stats.findMany({
    where: {
      deleted_at: null,
    },
    skip,
    take: limit,
    orderBy: {
      hot_score: "desc",
    },
    select: {
      id: true,
      vote_score: true,
      comment_count: true,
      view_count: true,
      content_type: true,
      created_at: true,
      updated_at: true,
    },
  });
  const total = await MyGlobal.prisma.reddit_platform_post_view_stats.count({
    where: {
      deleted_at: null,
    },
  });
  const transformedData: IRedditPlatformPostSummary[] = data.map((record) => {
    return {
      id: record.id as string & tags.Format<"uuid">,
      title: "",
      content_type: record.content_type,
      vote_score: record.vote_score,
      comment_count: record.comment_count,
      view_count: record.view_count,
      created_at: toISOStringSafe(record.created_at) as string &
        tags.Format<"date-time">,
      author_id: null,
      community_id: null,
      community: {
        id: null,
        name: "",
      },
    };
  });
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
