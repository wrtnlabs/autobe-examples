import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteRedditCommunityMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const comment =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        reddit_community_member_id: true,
        reddit_community_post_id: true,
        deleted_at: true,
        post: {
          select: {
            reddit_community_community_id: true,
          },
        },
      },
    });
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment already deleted", 404);
  }
  if (comment.reddit_community_post_id !== props.postId) {
    throw new HttpException("Comment not found in this post", 404);
  }
  const isAuthor = comment.reddit_community_member_id === props.member.id;
  let isModerator = false;
  let isOwner = false;
  if (!isAuthor) {
    const moderator =
      await MyGlobal.prisma.reddit_community_moderators.findFirst({
        where: {
          community_id: comment.post.reddit_community_community_id,
          member_id: props.member.id,
          deleted_at: null,
        },
      });
    isModerator = moderator !== null;
    if (!isModerator) {
      const community =
        await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
          where: { id: comment.post.reddit_community_community_id },
          select: { reddit_community_member_id: true },
        });
      isOwner = community.reddit_community_member_id === props.member.id;
    }
  }
  if (!isAuthor && !isModerator && !isOwner) {
    throw new HttpException("Forbidden", 403);
  }
  const now = new Date();
  await MyGlobal.prisma.reddit_community_comments.update({
    where: { id: props.commentId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
  async function deleteReplies(parentId: string): Promise<void> {
    const replies = await MyGlobal.prisma.reddit_community_comments.findMany({
      where: {
        parent_comment_id: parentId,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (replies.length > 0) {
      await MyGlobal.prisma.reddit_community_comments.updateMany({
        where: {
          parent_comment_id: parentId,
          deleted_at: null,
        },
        data: {
          deleted_at: now,
          updated_at: now,
        },
      });
      for (const reply of replies) {
        await deleteReplies(reply.id);
      }
    }
  }
  await deleteReplies(props.commentId);
}
