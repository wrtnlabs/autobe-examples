import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMember";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformMemberAtSummaryTransformer } from "../transformers/RedditPlatformMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformUsers(props: {
  body: IRedditPlatformMember.IRequest;
}): Promise<IPageIRedditPlatformMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const boundedLimit = limit > 100 ? 100 : limit < 1 ? 1 : limit;
  const skip = (page - 1) * boundedLimit;
  const whereInput: Prisma.reddit_platform_membersWhereInput = {
    deleted_at: null,
    ...(props.body.displayName
      ? {
          display_name: {
            contains: props.body.displayName,
            mode: "insensitive" as const,
          },
        }
      : {}),
    ...(props.body.username
      ? {
          username: {
            contains: props.body.username,
            mode: "insensitive" as const,
          },
        }
      : {}),
    ...(props.body.karmaScoreMin !== undefined
      ? { karma_score: { gte: props.body.karmaScoreMin } }
      : {}),
    ...(props.body.karmaScoreMax !== undefined
      ? { karma_score: { lte: props.body.karmaScoreMax } }
      : {}),
  };
  const orderBy: Prisma.reddit_platform_membersOrderByWithRelationInput[] =
    props.body.sortBy === "createdAt"
      ? [{ created_at: props.body.sortOrder === "ASC" ? "asc" : "desc" }]
      : props.body.sortBy === "karmaScore"
        ? [{ karma_score: props.body.sortOrder === "ASC" ? "asc" : "desc" }]
        : props.body.sortBy === "subscriptionCount"
          ? [
              {
                subscriptions: {
                  _count: props.body.sortOrder === "ASC" ? "asc" : "desc",
                },
              },
            ]
          : [{ created_at: "desc" }];
  const data = await MyGlobal.prisma.reddit_platform_members.findMany({
    where: whereInput,
    skip,
    take: boundedLimit,
    orderBy,
    ...RedditPlatformMemberAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_platform_members.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditPlatformMemberAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: boundedLimit,
      records: total,
      pages: Math.ceil(total / boundedLimit),
    } satisfies IPage.IPagination,
  };
}
