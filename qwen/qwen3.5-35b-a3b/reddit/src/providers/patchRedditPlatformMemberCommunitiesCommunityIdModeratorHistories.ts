import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformModeratorHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformModeratorHistory";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformModeratorHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModeratorHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformModeratorHistoryAtSummaryTransformer } from "../transformers/RedditPlatformModeratorHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberCommunitiesCommunityIdModeratorHistories(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditPlatformModeratorHistory.IRequest;
}): Promise<IPageIRedditPlatformModeratorHistory.ISummary> {
  // Authorization: Verify member is moderator of the community
  const moderator =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.member.id,
      },
    });
  if (moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Build filter from request body
  const whereInput: Prisma.reddit_platform_moderator_historiesWhereInput = {
    community_id: props.communityId,
    deleted_at: null,
    ...(props.body.action_type !== undefined && {
      action_type: props.body.action_type,
    }),
    ...(props.body.user_id !== undefined && {
      user_id: props.body.user_id,
    }),
    ...(props.body.performed_by_user_id !== undefined && {
      acted_by_id: props.body.performed_by_user_id,
    }),
    ...(props.body.created_at_from !== undefined && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: { lte: new Date(props.body.created_at_to) },
    }),
  } satisfies Prisma.reddit_platform_moderator_historiesWhereInput;
  // Sort by created_at (default descending)
  const orderByInput: Prisma.reddit_platform_moderator_historiesOrderByWithRelationInput[] =
    props.body.order === "asc"
      ? [{ created_at: "asc" as const }]
      : [{ created_at: "desc" as const }];
  // Pagination: page and limit
  const page: number = Number(props.body.page ?? 1);
  const limit: number = Number(props.body.limit ?? 20);
  const skip = (page - 1) * limit;
  // Query data
  const data =
    await MyGlobal.prisma.reddit_platform_moderator_histories.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...RedditPlatformModeratorHistoryAtSummaryTransformer.select(),
    });
  // Query total count
  const total = await MyGlobal.prisma.reddit_platform_moderator_histories.count(
    {
      where: whereInput,
    },
  );
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditPlatformModeratorHistoryAtSummaryTransformer.transform,
  );
  // Calculate pages (0 if total is 0)
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  // Return paginated response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIRedditPlatformModeratorHistory.ISummary;
}
