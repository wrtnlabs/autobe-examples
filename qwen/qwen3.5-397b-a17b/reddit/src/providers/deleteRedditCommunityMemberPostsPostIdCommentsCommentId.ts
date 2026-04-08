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
  // 1. Verify comment exists and is not deleted
  const comment =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: {
        id: props.commentId,
        deleted_at: null,
      },
    });
  // 2. Verify post exists, is not deleted, and matches postId
  const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      reddit_community_community_id: true,
    },
  });
  // 3. Check authorization: comment author OR community moderator
  const isAuthor = comment.reddit_community_member_id === props.member.id;
  let isModerator = false;
  if (!isAuthor) {
    const moderator =
      await MyGlobal.prisma.reddit_community_moderators.findFirst({
        where: {
          reddit_community_member_id: props.member.id,
          reddit_community_community_id: post.reddit_community_community_id,
          deleted_at: null,
        },
      });
    isModerator = moderator !== null;
  }
  if (!isAuthor && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Soft delete the comment and all nested replies
  async function cascadeDeleteReplies(parentCommentId: string): Promise<void> {
    const replies = await MyGlobal.prisma.reddit_community_comments.findMany({
      where: {
        reddit_community_comment_id: parentCommentId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    for (const reply of replies) {
      await MyGlobal.prisma.reddit_community_comments.update({
        where: {
          id: reply.id,
        },
        data: {
          deleted_at: toISOStringSafe(new Date()),
        },
      });
      await cascadeDeleteReplies(reply.id);
    }
  }
  // Delete the target comment
  await MyGlobal.prisma.reddit_community_comments.update({
    where: {
      id: props.commentId,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  // Cascade delete to all nested replies
  await cascadeDeleteReplies(props.commentId);
}
