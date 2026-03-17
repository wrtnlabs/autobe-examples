import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPostAtSummaryTransformer } from "../transformers/CommunityPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPosts(props: {
  body: ICommunityPost.IRequest;
}): Promise<IPageICommunityPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const getTimeRangeCutoff = (
    timeRange: string | null | undefined,
  ): Date | null => {
    if (!timeRange || timeRange === "all_time") return null;
    const now = Date.now();
    const msPerDay = 24 * 60 * 60 * 1000;
    switch (timeRange) {
      case "today":
        return new Date(now - msPerDay);
      case "this_week":
        return new Date(now - 7 * msPerDay);
      case "this_month":
        return new Date(now - 30 * msPerDay);
      case "this_year":
        return new Date(now - 365 * msPerDay);
      default:
        return null;
    }
  };
  const timeRangeCutoff =
    props.body.sort === "top" ? getTimeRangeCutoff(props.body.timeRange) : null;
  // Compute effective gte for created_at: take the more restrictive (later) of createdAtFrom and timeRangeCutoff
  const createdAtFrom =
    props.body.createdAtFrom != null
      ? new Date(props.body.createdAtFrom)
      : null;
  const effectiveGte: Date | null =
    createdAtFrom !== null && timeRangeCutoff !== null
      ? createdAtFrom > timeRangeCutoff
        ? createdAtFrom
        : timeRangeCutoff
      : createdAtFrom !== null
        ? createdAtFrom
        : timeRangeCutoff;
  const createdAtTo =
    props.body.createdAtTo != null ? new Date(props.body.createdAtTo) : null;
  const createdAtFilter: Prisma.DateTimeFilter<"community_posts"> | undefined =
    effectiveGte !== null || createdAtTo !== null
      ? {
          ...(effectiveGte !== null && { gte: effectiveGte }),
          ...(createdAtTo !== null && { lte: createdAtTo }),
        }
      : undefined;
  const whereInput = {
    deleted_at: null,
    ...(props.body.communityId != null && {
      community_community_id: props.body.communityId,
    }),
    ...(props.body.type != null && { type: props.body.type }),
    ...(props.body.keyword != null && {
      title: { contains: props.body.keyword, mode: "insensitive" as const },
    }),
    ...(createdAtFilter !== undefined && { created_at: createdAtFilter }),
  } satisfies Prisma.community_postsWhereInput;
  const sort = props.body.sort ?? "new";
  const orderByInput: Prisma.community_postsOrderByWithRelationInput =
    sort === "top" || sort === "controversial"
      ? { votes: { _count: "desc" } }
      : { created_at: "desc" };
  const data = await MyGlobal.prisma.community_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...CommunityPostAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_posts.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      CommunityPostAtSummaryTransformer.transform,
    ),
  };
}
