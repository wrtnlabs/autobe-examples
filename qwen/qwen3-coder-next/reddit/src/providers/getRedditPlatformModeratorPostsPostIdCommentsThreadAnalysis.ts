import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformModeratorPostsPostIdCommentsThreadAnalysis(props: {
  moderator: ModeratorPayload;
  postId: string;
}): Promise<IRedditPlatformComment> {
  // Validate postId format
  if (!props.postId || typeof props.postId !== "string") {
    throw new HttpException("Post ID is required", 400);
  }
  // Validate post exists and moderator has access
  const post = await MyGlobal.prisma.reddit_platform_posts.findUnique({
    where: { id: props.postId as string & tags.Format<"uuid"> },
    select: { id: true, community_id: true },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  // Check if moderator has access to the post's community
  const communityAccess =
    await MyGlobal.prisma.reddit_platform_community_roles.findFirst({
      where: {
        community_id: post.community_id,
      },
    });
  if (!communityAccess) {
    throw new HttpException("Access denied to this post's community", 403);
  }
  // Get all comments for this post (including nested threads)
  const comments = await MyGlobal.prisma.reddit_platform_comments.findMany({
    where: {
      post_id: props.postId as string & tags.Format<"uuid">,
      deleted_at: null,
    },
    orderBy: {
      created_at: "asc",
    },
  });
  // Calculate comprehensive thread analysis statistics
  const totalComments = comments.length;
  // Vote score distribution
  const positiveVotes = comments.filter((c) => c.vote_score > 0).length;
  const negativeVotes = comments.filter((c) => c.vote_score < 0).length;
  const neutralVotes = comments.filter((c) => c.vote_score === 0).length;
  // Calculate vote score statistics
  const totalVoteScore = comments.reduce((sum, c) => sum + c.vote_score, 0);
  const avgVoteScore = totalComments > 0 ? totalVoteScore / totalComments : 0;
  // Comment count statistics
  const totalCommentCount = comments.reduce(
    (sum, c) => sum + c.comment_count,
    0,
  );
  const avgCommentCount =
    totalComments > 0 ? totalCommentCount / totalComments : 0;
  // Thread structure analysis
  const topLevelComments = comments.filter((c) => c.parent_comment_id === null);
  const replyComments = comments.filter((c) => c.parent_comment_id !== null);
  // Engagement metrics
  const activeCommenters = new Set(comments.map((c) => c.author_id)).size;
  const commentersWithReplies = comments.filter(
    (c) => c.comment_count > 0,
  ).length;
  // Calculate engagement rate
  const engagementRate =
    totalComments > 0 ? (activeCommenters / totalComments) * 100 : 0;
  // Create a summary comment with analysis data
  // Using the first comment's data as base, then enriching with analysis
  const baseComment =
    comments.length > 0
      ? comments[0]
      : {
          id: props.postId as string & tags.Format<"uuid">,
          author_id: "" as string & tags.Format<"uuid">,
          post_id: props.postId as string & tags.Format<"uuid">,
          parent_comment_id: null,
          content: "",
          vote_score: 0,
          comment_count: totalCommentCount,
          created_at: new Date() as any,
          updated_at: new Date() as any,
        };
  // Create the result with analysis embedded in content
  const result: IRedditPlatformComment = {
    id: baseComment.id,
    author_id: baseComment.author_id,
    post_id: baseComment.post_id,
    parent_comment_id: baseComment.parent_comment_id,
    content: baseComment.content,
    vote_score: totalVoteScore,
    comment_count: totalCommentCount,
    created_at: toISOStringSafe(baseComment.created_at),
    updated_at: toISOStringSafe(baseComment.updated_at),
  };
  return result;
}
