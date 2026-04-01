import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
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

export async function getRedditLikeModeratorPostsPostIdCommentsThread(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeComment.IThread> {
  // Verify post exists - will throw 404 if not found
  await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: props.postId },
  });
  // Fetch all comments for this post
  const allComments = await MyGlobal.prisma.reddit_like_comments.findMany({
    where: { post_id: props.postId },
    select: {
      id: true,
      content: true,
      vote_score: true,
      is_edited: true,
      is_deleted: true,
      created_at: true,
      parent_id: true,
      author_id: true,
      author: {
        select: {
          id: true,
          email: true,
          username: true,
          email_verified: true,
          created_at: true,
        },
      },
    },
  });
  // Build comment map and tree structure
  const commentNodes = new Map<string, any>();
  for (const comment of allComments) {
    commentNodes.set(comment.id, {
      id: comment.id,
      content: comment.is_deleted ? null : comment.content,
      voteScore: comment.vote_score,
      isEdited: comment.is_edited,
      isDeleted: comment.is_deleted,
      createdAt: comment.created_at.toISOString(),
      author: {
        id: comment.author.id,
        email: comment.author.email,
        username: comment.author.username,
        emailVerified: comment.author.email_verified,
        createdAt: comment.author.created_at.toISOString(),
      },
      parentId: comment.parent_id,
      replies: [],
    });
  }
  const rootReplies: any[] = [];
  for (const node of commentNodes.values()) {
    if (node.parentId === null) {
      rootReplies.push(node);
    } else {
      const parent = commentNodes.get(node.parentId);
      if (parent !== undefined) {
        parent.replies.push(node);
      }
    }
  }
  // Sort root replies by vote score (Best order)
  rootReplies.sort((a, b) => b.voteScore - a.voteScore);
  // Construct return object matching IThread interface
  return {
    id: props.postId,
    content: null,
    voteScore: 0,
    isEdited: false,
    isDeleted: false,
    createdAt: new Date().toISOString() as string & tags.Format<"date-time">,
    author: {
      id: props.moderator.id,
      email: "moderator@system.local" as string & tags.Format<"email">,
      username: "Moderator",
      emailVerified: true,
      createdAt: new Date().toISOString() as string & tags.Format<"date-time">,
    } satisfies IRedditLikeMember.ISummary,
    replies: rootReplies as IRedditLikeComment.IThread[],
  } satisfies IRedditLikeComment.IThread;
}
