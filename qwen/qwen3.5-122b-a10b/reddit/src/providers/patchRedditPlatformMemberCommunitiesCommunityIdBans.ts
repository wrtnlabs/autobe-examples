import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunityBan";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommunityAtSummaryTransformer } from "../transformers/RedditPlatformCommunityAtSummaryTransformer";
import { RedditPlatformCommunityBanAtSummaryTransformer } from "../transformers/RedditPlatformCommunityBanAtSummaryTransformer";
import { RedditPlatformMemberAtSummaryTransformer } from "../transformers/RedditPlatformMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberCommunitiesCommunityIdBans(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditPlatformCommunityBan.IRequest;
}): Promise<IPageIRedditPlatformCommunityBan.ISummary> {
  // Verify community exists
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUnique({
      where: { id: props.communityId, deleted_at: null },
    });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // Verify member is a moderator in this community
  const moderator =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        reddit_platform_community_id: props.communityId,
        reddit_platform_member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (moderator === null) {
    throw new HttpException("Not authorized to view ban list", 403);
  }
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where condition with filters
  const whereInput: Prisma.reddit_platform_community_bansWhereInput = {
    reddit_platform_community_id: props.communityId,
    deleted_at: null,
    ...(props.body.banned_by_member_id !== undefined && {
      banned_by_member_id: props.body.banned_by_member_id,
    }),
    ...(props.body.created_at_from !== undefined && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
    ...(props.body.search !== undefined && {
      member: {
        OR: [
          { username: { contains: props.body.search } },
          { display_name: { contains: props.body.search } },
        ],
      },
    }),
  } satisfies Prisma.reddit_platform_community_bansWhereInput;
  // Fetch paginated ban records
  const bans = await MyGlobal.prisma.reddit_platform_community_bans.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      community: RedditPlatformCommunityAtSummaryTransformer.select(),
      member: RedditPlatformMemberAtSummaryTransformer.select(),
      bannedBy: RedditPlatformMemberAtSummaryTransformer.select(),
    },
  });
  // Count total records
  const total = await MyGlobal.prisma.reddit_platform_community_bans.count({
    where: whereInput,
  });
  // Transform and return
  return {
    data: await ArrayUtil.asyncMap(
      bans,
      RedditPlatformCommunityBanAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditPlatformCommunityBan.ISummary;
}
