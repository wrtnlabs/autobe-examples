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

export async function getRedditPlatformControversial(props: {
  page?: number & tags.Type<"int32"> & tags.Minimum<1>;
  limit?: number & tags.Type<"int32"> & tags.Minimum<1>;
}): Promise<IPageIRedditPlatformPost.ISummary> {
  const page = props.page ?? 1;
  const limit = props.limit ?? 100;
  const skip = (page - 1) * limit;
  const [posts, total] = await Promise.all([
    MyGlobal.prisma.reddit_platform_posts.findMany({
      where: {
        deleted_at: null,
      },
      skip,
      take: limit,
      orderBy: {
        vote_score: "desc",
      },
    }),
    MyGlobal.prisma.reddit_platform_posts.count({
      where: {
        deleted_at: null,
      },
    }),
  ]);
  // Calculate controversy scores and sort by them
  const postsWithControversy = posts
    .map((record) => ({
      ...record,
      controversy_score:
        record.vote_score *
        (1 - Math.abs(record.vote_score) / (record.vote_score + 1)),
    }))
    .sort((a, b) => b.controversy_score - a.controversy_score);
  return {
    data: postsWithControversy.map((record) => ({
      id: record.id,
      title: record.title,
      vote_score: record.vote_score,
      created_at: toISOStringSafe(record.created_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
