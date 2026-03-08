import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformFeedRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedRequest";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformPostAtSummaryTransformer } from "../transformers/RedditPlatformPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformFeedsTop(props: {
  body: IRedditPlatformFeedRequest;
}): Promise<IPageIRedditPlatformPost.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const timeRange: string | undefined = props.body.timeRange;
  const communityId: (string & tags.Format<"uuid">) | undefined =
    props.body.communityId;
  let whereInput: Prisma.reddit_platform_postsWhereInput = {
    deleted_at: null,
  };
  if (communityId !== undefined) {
    whereInput.reddit_platform_community_id = communityId;
  }
  if (
    props.body.sortType === "TOP" &&
    timeRange !== undefined &&
    timeRange !== "ALL"
  ) {
    const now: Date = new Date();
    let startDate: Date = now;
    switch (timeRange) {
      case "TODAY":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "WEEK":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "MONTH":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "YEAR":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
    }
    whereInput.created_at = {
      gte: startDate,
    } satisfies Prisma.DateTimeFilter;
  }
  const orderByInput: Array<Prisma.reddit_platform_postsOrderByWithRelationInput> =
    [
      { vote_score: "desc" as const },
      { created_at: "desc" as const },
    ] satisfies Array<Prisma.reddit_platform_postsOrderByWithRelationInput>;
  const data: Array<
    Prisma.reddit_platform_postsGetPayload<
      ReturnType<typeof RedditPlatformPostAtSummaryTransformer.select>
    >
  > = await MyGlobal.prisma.reddit_platform_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditPlatformPostAtSummaryTransformer.select(),
  });
  const total: number = await MyGlobal.prisma.reddit_platform_posts.count({
    where: whereInput,
  });
  const totalPages: number = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditPlatformPostAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: totalPages,
    } satisfies IPage.IPagination,
  };
}
