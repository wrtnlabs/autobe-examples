import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityPostAtSummaryTransformer } from "../transformers/RedditCommunityPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberPosts(props: {
  member: MemberPayload;
  body: IRedditCommunityPost.IRequest;
}): Promise<IPageIRedditCommunityPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause based on feedType
  const whereInput: Prisma.reddit_community_postsWhereInput = {
    deleted_at: null,
  };
  // Feed type filtering
  if (props.body.feedType === "home") {
    const subscriptions =
      await MyGlobal.prisma.reddit_community_subscriptions.findMany({
        where: { member_id: props.member.id },
        select: { community_id: true },
      });
    whereInput.reddit_community_community_id = {
      in: subscriptions.map((s) => s.community_id),
    };
  } else if (props.body.feedType === "community" && props.body.communityName) {
    const community =
      await MyGlobal.prisma.reddit_community_communities.findFirst({
        where: { name: props.body.communityName, deleted_at: null },
        select: { id: true },
      });
    if (community) {
      whereInput.reddit_community_community_id = community.id;
    } else {
      whereInput.reddit_community_community_id = {
        in: [],
      };
    }
  }
  const bans = await MyGlobal.prisma.reddit_community_bans.findMany({
    where: {
      reddit_community_member_id: props.member.id,
      deleted_at: null,
    },
    select: { reddit_community_community_id: true },
  });
  if (bans.length > 0) {
    const bannedCommunityIds = bans.map((b) => b.reddit_community_community_id);
    if (
      whereInput.reddit_community_community_id &&
      typeof whereInput.reddit_community_community_id === "object" &&
      "in" in whereInput.reddit_community_community_id
    ) {
      whereInput.reddit_community_community_id = {
        in: (
          whereInput.reddit_community_community_id as {
            in: string[];
          }
        ).in.filter((id) => !bannedCommunityIds.includes(id)),
      };
    } else if (
      whereInput.reddit_community_community_id &&
      typeof whereInput.reddit_community_community_id === "string"
    ) {
      if (
        bannedCommunityIds.includes(whereInput.reddit_community_community_id)
      ) {
        whereInput.reddit_community_community_id = { in: [] };
      }
    } else {
      whereInput.reddit_community_community_id = {
        notIn: bannedCommunityIds,
      };
    }
  }
  if (props.body.postType) {
    whereInput.post_type = props.body.postType;
  }
  if (
    props.body.sort === "top" &&
    props.body.timeFilter &&
    props.body.timeFilter !== "all"
  ) {
    const now = new Date();
    let startDate: Date;
    switch (props.body.timeFilter) {
      case "today":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0);
    }
    whereInput.created_at = { gte: startDate };
  }
  const orderByInput: Prisma.reddit_community_postsOrderByWithRelationInput =
    props.body.sort === "new"
      ? { created_at: "desc" }
      : props.body.sort === "top"
        ? { created_at: "desc" }
        : { created_at: "desc" };
  const data = await MyGlobal.prisma.reddit_community_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCommunityPostAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_community_posts.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunityPostAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
