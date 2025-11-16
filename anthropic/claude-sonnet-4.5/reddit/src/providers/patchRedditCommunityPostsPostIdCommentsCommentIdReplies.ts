import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";

export async function patchRedditCommunityPostsPostIdCommentsCommentIdReplies(props: {
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCommunityComment.IRequest;
}): Promise<IPageIRedditCommunityComment.ISummary> {
  const parentComment =
    await MyGlobal.prisma.reddit_community_comments.findUnique({
      where: { id: props.commentId },
    });

  if (!parentComment) {
    throw new HttpException("Parent comment not found", 404);
  }

  if (parentComment.reddit_community_post_id !== props.postId) {
    throw new HttpException(
      "Comment does not belong to the specified post",
      400,
    );
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortOrder = props.body.sort ?? "new";

  const [replies, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_comments.findMany({
      where: {
        parent_comment_id: props.commentId,
        deleted_at: null,
        ...(props.body.search && {
          body: {
            contains: props.body.search,
          },
        }),
      },
      skip,
      take: limit,
      orderBy:
        sortOrder === "old" ? { created_at: "asc" } : { created_at: "desc" },
    }),
    MyGlobal.prisma.reddit_community_comments.count({
      where: {
        parent_comment_id: props.commentId,
        deleted_at: null,
        ...(props.body.search && {
          body: {
            contains: props.body.search,
          },
        }),
      },
    }),
  ]);

  if (replies.length === 0) {
    return {
      data: [],
      pagination: {
        current: 0,
        limit,
        records: 0,
        pages: 0,
      },
    };
  }

  const memberIds = [
    ...new Set(replies.map((r) => r.reddit_community_member_id)),
  ];
  const postIds = [...new Set(replies.map((r) => r.reddit_community_post_id))];

  const [members, posts] = await Promise.all([
    MyGlobal.prisma.reddit_community_members.findMany({
      where: { id: { in: memberIds } },
    }),
    MyGlobal.prisma.reddit_community_posts.findMany({
      where: { id: { in: postIds } },
    }),
  ]);

  const memberMap = new Map(members.map((m) => [m.id, m]));
  const postMap = new Map(posts.map((p) => [p.id, p]));

  const communityIds = [
    ...new Set(posts.map((p) => p.reddit_community_community_id)),
  ];
  const postMemberIds = [
    ...new Set(posts.map((p) => p.reddit_community_member_id)),
  ];

  const [communities, postMembers, postVoteCounts, commentCounts] =
    await Promise.all([
      MyGlobal.prisma.reddit_community_communities.findMany({
        where: { id: { in: communityIds } },
      }),
      MyGlobal.prisma.reddit_community_members.findMany({
        where: { id: { in: postMemberIds } },
      }),
      MyGlobal.prisma.reddit_community_post_votes.groupBy({
        by: ["reddit_community_post_id"],
        where: { reddit_community_post_id: { in: postIds } },
        _sum: { vote_type: true },
      }),
      MyGlobal.prisma.reddit_community_comments.groupBy({
        by: ["reddit_community_post_id"],
        where: { reddit_community_post_id: { in: postIds }, deleted_at: null },
        _count: { id: true },
      }),
    ]);

  const communityMap = new Map(communities.map((c) => [c.id, c]));
  const postMemberMap = new Map(postMembers.map((m) => [m.id, m]));
  const voteScoreMap = new Map(
    postVoteCounts.map((v) => [
      v.reddit_community_post_id,
      v._sum?.vote_type ?? 0,
    ]),
  );
  const commentCountMap = new Map(
    commentCounts.map((c) => [c.reddit_community_post_id, c._count.id]),
  );

  const data: IRedditCommunityComment.ISummary[] = replies.map((reply) => {
    const member = memberMap.get(reply.reddit_community_member_id)!;
    const post = postMap.get(reply.reddit_community_post_id)!;
    const community = communityMap.get(post.reddit_community_community_id)!;
    const postMember = postMemberMap.get(post.reddit_community_member_id)!;
    const voteScore = voteScoreMap.get(post.id) ?? 0;
    const commentCount = commentCountMap.get(post.id) ?? 0;

    return {
      id: reply.id,
      body: reply.body,
      depth: reply.depth,
      edited: reply.edited,
      created_at: toISOStringSafe(reply.created_at),
      author: {
        id: member.id,
        username: member.username,
        display_name: member.display_name ?? undefined,
        bio: member.bio ?? undefined,
        avatar_url: member.avatar_url ?? undefined,
        post_karma: member.post_karma,
        comment_karma: member.comment_karma,
        created_at: toISOStringSafe(member.created_at),
      },
      post: {
        id: post.id,
        title: post.title,
        post_type: post.post_type as "link" | "text" | "image",
        vote_score: voteScore,
        comment_count: commentCount,
        edited: post.edited,
        created_at: toISOStringSafe(post.created_at),
        author: {
          id: postMember.id,
          username: postMember.username,
          display_name: postMember.display_name ?? undefined,
          bio: postMember.bio ?? undefined,
          avatar_url: postMember.avatar_url ?? undefined,
          post_karma: postMember.post_karma,
          comment_karma: postMember.comment_karma,
          created_at: toISOStringSafe(postMember.created_at),
        },
        community: {
          id: community.id,
          name: community.name,
          display_title: community.display_title,
          description: community.description,
          icon_url: community.icon_url ?? undefined,
          banner_url: community.banner_url ?? undefined,
          subscriber_count: community.subscriber_count,
          post_count: community.post_count,
          created_at: toISOStringSafe(community.created_at),
        },
      },
    };
  });

  return {
    data,
    pagination: {
      current: total === 0 ? 0 : page - 1,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
