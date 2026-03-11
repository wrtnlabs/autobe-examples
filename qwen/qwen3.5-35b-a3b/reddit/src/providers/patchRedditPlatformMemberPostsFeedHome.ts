import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { IRedditPlatformPostFeedRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostFeedRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// Patch home feed: fetch paginated posts from member's subscribed communities
export async function patchRedditPlatformMemberPostsFeedHome(props: {
  member: MemberPayload;
  body: IRedditPlatformPostFeedRequest;
}): Promise<IPageIRedditPlatformPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.pageSize ?? 100;
  const skip = (page - 1) * limit;
  // Ensure page and limit are within valid bounds
  const validatedPage = page < 1 ? 1 : page;
  const validatedLimit = limit < 1 ? 1 : limit > 100 ? 100 : limit;
  // Build where clause for subscribed communities
  const subscribedCommunitiesWhere = {
    reddit_platform_member_id: props.member.id,
    deleted_at: null,
  } satisfies Prisma.reddit_platform_community_subscriptionsWhereInput;
  // Get subscribed community IDs
  const subscriptions =
    await MyGlobal.prisma.reddit_platform_community_subscriptions.findMany({
      where: subscribedCommunitiesWhere,
      select: { reddit_platform_community_id: true },
    });
  const subscribedCommunityIds = subscriptions.map(
    (s) => s.reddit_platform_community_id,
  );
  // Build post filter for subscribed communities
  const postsWhere: Prisma.reddit_platform_postsWhereInput = {
    deleted_at: null,
    ...(subscribedCommunityIds.length > 0
      ? { reddit_platform_community_id: { in: subscribedCommunityIds } }
      : {}),
  };
  // Apply time range filter for top sorting
  const now = new Date();
  if (
    props.body.sortOrder === "top" &&
    props.body.timeRange &&
    props.body.timeRange !== "all_time"
  ) {
    const dateThreshold = (() => {
      switch (props.body.timeRange) {
        case "today":
          return new Date(now.getTime() - 24 * 60 * 60 * 1000);
        case "this_week":
          return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        case "this_month":
          return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        case "this_year":
          return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        default:
          return null;
      }
    })();
    if (dateThreshold) {
      postsWhere.created_at = { gte: dateThreshold };
    }
  }
  // Build order by based on sort order
  const orderBy: Prisma.reddit_platform_postsOrderByWithRelationInput[] =
    (() => {
      switch (props.body.sortOrder) {
        case "new":
          return [{ created_at: "desc" }];
        case "top":
          return [{ vote_score: "desc" }, { created_at: "desc" }];
        case "hot":
          // Hot sort: recent posts with high engagement
          return [{ created_at: "desc" }, { vote_score: "desc" }];
        case "controversial":
          // Controversial: posts with high total votes but score near zero
          // We'll use vote_score ASC first, then by total votes
          return [{ vote_score: "asc" }, { comment_count: "desc" }];
        default:
          return [{ created_at: "desc" }];
      }
    })();
  // Get posts
  const posts = await MyGlobal.prisma.reddit_platform_posts.findMany({
    where: postsWhere,
    skip,
    take: validatedLimit,
    orderBy,
    select: {
      id: true,
      title: true,
      post_type: true,
      vote_score: true,
      comment_count: true,
      created_at: true,
      author: {
        select: {
          id: true,
          username: true,
          display_name: true,
          karma_score: true,
          is_active: true,
          created_at: true,
        },
      },
      community: {
        select: {
          id: true,
          name: true,
          description: true,
          icon_url: true,
          subscriber_count: true,
          created_at: true,
          owner: {
            select: {
              id: true,
              username: true,
              display_name: true,
              karma_score: true,
              is_active: true,
              created_at: true,
            },
          },
        },
      },
    },
  });
  // Get total count
  const total = await MyGlobal.prisma.reddit_platform_posts.count({
    where: postsWhere,
  });
  // Transform posts to ISummary format
  const transformedPosts = await ArrayUtil.asyncMap(posts, async (post) => {
    return {
      id: post.id as string & tags.Format<"uuid">,
      title: post.title,
      post_type: post.post_type as "TEXT" | "LINK" | "IMAGE",
      vote_score: post.vote_score,
      comment_count: post.comment_count,
      author: {
        id: post.author.id as string & tags.Format<"uuid">,
        username: post.author.username,
        display_name: post.author.display_name,
        karma_score: post.author.karma_score,
        is_active: post.author.is_active,
        created_at: post.author.created_at.toISOString() as string &
          tags.Format<"date-time">,
      } satisfies IRedditPlatformMember.ISummary,
      community: {
        id: post.community.id as string & tags.Format<"uuid">,
        name: post.community.name,
        description: post.community.description,
        icon_url: post.community.icon_url,
        subscriber_count: post.community.subscriber_count,
        created_at: post.community.created_at.toISOString() as string &
          tags.Format<"date-time">,
        owner: {
          id: post.community.owner.id as string & tags.Format<"uuid">,
          username: post.community.owner.username,
          display_name: post.community.owner.display_name,
          karma_score: post.community.owner.karma_score,
          is_active: post.community.owner.is_active,
          created_at: post.community.owner.created_at.toISOString() as string &
            tags.Format<"date-time">,
        } satisfies IRedditPlatformMember.ISummary,
      } satisfies IRedditPlatformCommunity.ISummary,
      created_at: post.created_at.toISOString() as string &
        tags.Format<"date-time">,
    } satisfies IRedditPlatformPost.ISummary;
  });
  return {
    data: transformedPosts,
    pagination: {
      current: validatedPage,
      limit: validatedLimit,
      records: total,
      pages: Math.ceil(total / validatedLimit),
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditPlatformPost.ISummary;
}
