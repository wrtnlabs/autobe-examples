import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityFeedQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityFeedQuery";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityFeedQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFeedQuery";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityCommunityAtSummaryTransformer } from "../transformers/RedditCommunityCommunityAtSummaryTransformer";
import { RedditCommunityMemberAtSummaryTransformer } from "../transformers/RedditCommunityMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberHomeFeed(props: {
  member: MemberPayload;
  body: IRedditCommunityFeedQuery.IRequest;
}): Promise<IPageIRedditCommunityFeedQuery.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? props.body.pageSize ?? 100;
  const skip = (page - 1) * limit;
  // Query subscriptions to find communities member is subscribed to
  const subscriptions =
    await MyGlobal.prisma.reddit_community_subscriptions.findMany({
      where: {
        reddit_community_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        reddit_community_community_id: true,
      },
    });
  if (subscriptions.length === 0) {
    return {
      data: [],
      pagination: {
        current: page,
        limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  const communityIds = subscriptions.map(
    (s) => s.reddit_community_community_id,
  );
  // Build where clause with optional filters
  const whereClause: Prisma.reddit_community_postsWhereInput = {
    community_id: { in: communityIds },
    deleted_at: null,
    ...(props.body.postType !== undefined &&
      props.body.postType !== null && { post_type: props.body.postType }),
  };
  // Build orderBy based on sortOrder
  const orderByClause = (() => {
    switch (props.body.sortOrder) {
      case "new":
        return { created_at: "desc" as const };
      case "top":
        return { vote_score: "desc" as const };
      case "hot":
        return { created_at: "desc" as const };
      case "controversial":
        return { vote_score: "asc" as const };
      default:
        return { created_at: "desc" as const };
    }
  })();
  // Query posts with joins for author and community
  const posts = await MyGlobal.prisma.reddit_community_posts.findMany({
    where: whereClause,
    orderBy: orderByClause,
    skip,
    take: limit,
    select: {
      id: true,
      title: true,
      post_type: true,
      vote_score: true,
      comment_count: true,
      created_at: true,
      author: RedditCommunityMemberAtSummaryTransformer.select(),
      community: RedditCommunityCommunityAtSummaryTransformer.select(),
    },
  });
  // Query total count
  const total = await MyGlobal.prisma.reddit_community_posts.count({
    where: whereClause,
  });
  // Transform posts to summary format using transformers
  const data = await ArrayUtil.asyncMap(posts, async (post) => {
    const contentPreview = (() => {
      switch (post.post_type) {
        case "text":
          return post.title.length > 200
            ? post.title.substring(0, 200)
            : post.title;
        case "link":
          return "Link post";
        case "image":
          return "Image post";
        default:
          return post.title.length > 200
            ? post.title.substring(0, 200)
            : post.title;
      }
    })();
    const author = await RedditCommunityMemberAtSummaryTransformer.transform(
      post.author,
    );
    const community =
      await RedditCommunityCommunityAtSummaryTransformer.transform(
        post.community,
      );
    return {
      id: post.id,
      title: post.title,
      contentPreview,
      author,
      community,
      voteScore: post.vote_score,
      commentCount: post.comment_count,
      createdAt: toISOStringSafe(post.created_at),
    } satisfies IRedditCommunityFeedQuery.ISummary;
  });
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
