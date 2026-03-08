import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
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

export async function patchRedditPlatformUsersUserIdPosts(props: {
  userId: string & tags.Format<"uuid">;
  body: IRedditPlatformPost.IRequest;
}): Promise<IPageIRedditPlatformPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Validate user exists
  await MyGlobal.prisma.reddit_platform_members.findUniqueOrThrow({
    where: { id: props.userId },
  });
  // Build base where conditions
  const baseConditions: Prisma.reddit_platform_postsWhereInput[] = [
    { reddit_platform_member_id: props.userId },
    { deleted_at: null },
  ];
  // Add post type filter
  if (props.body.post_type) {
    baseConditions.push({ post_type: props.body.post_type });
  }
  // Add community filter
  if (props.body.community_id) {
    baseConditions.push({
      reddit_platform_community_id: props.body.community_id,
    });
  }
  // Build date range conditions
  const dateConditions: Prisma.reddit_platform_postsWhereInput[] = [];
  if (props.body.start_date) {
    dateConditions.push({ created_at: { gte: props.body.start_date } });
  }
  if (props.body.end_date) {
    dateConditions.push({ created_at: { lte: props.body.end_date } });
  }
  // Handle TOP sorting with time range
  if (
    props.body.sort_type === "TOP" &&
    props.body.time_range &&
    props.body.time_range !== "ALL"
  ) {
    const now = new Date();
    let startDate = new Date();
    switch (props.body.time_range) {
      case "TODAY":
        startDate.setHours(0, 0, 0, 0);
        break;
      case "WEEK":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "MONTH":
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "YEAR":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }
    if (startDate.getTime() !== now.getTime()) {
      const startDateIso = toISOStringSafe(startDate);
      dateConditions.push({ created_at: { gte: startDateIso } });
    }
  }
  // Combine all conditions
  const allConditions: Prisma.reddit_platform_postsWhereInput[] = [
    ...baseConditions,
    ...dateConditions,
  ];
  // Build where input with AND operator
  const whereInput: Prisma.reddit_platform_postsWhereInput =
    allConditions.length === 1 ? allConditions[0] : { AND: allConditions };
  // Build sort order
  let orderByInput: Prisma.reddit_platform_postsOrderByWithRelationInput[];
  switch (props.body.sort_type) {
    case "HOT":
      orderByInput = [
        { vote_score: "desc" },
        { created_at: "desc" },
      ] satisfies Prisma.reddit_platform_postsOrderByWithRelationInput[];
      break;
    case "TOP":
      orderByInput = [
        { vote_score: "desc" },
      ] satisfies Prisma.reddit_platform_postsOrderByWithRelationInput[];
      break;
    case "CONTROVERSIAL":
      orderByInput = [
        { vote_score: "asc" },
      ] satisfies Prisma.reddit_platform_postsOrderByWithRelationInput[];
      break;
    default:
      orderByInput = [
        { created_at: "desc" },
      ] satisfies Prisma.reddit_platform_postsOrderByWithRelationInput[];
  }
  // Fetch posts with joins
  const data = await MyGlobal.prisma.reddit_platform_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditPlatformPostAtSummaryTransformer.select(),
  });
  // Fetch total count
  const total = await MyGlobal.prisma.reddit_platform_posts.count({
    where: whereInput,
  });
  // Transform and return
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      RedditPlatformPostAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditPlatformPost.ISummary;
}
