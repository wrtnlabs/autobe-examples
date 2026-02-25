import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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

export async function putDiscussionBoardMemberCommentsCommentId(props: {
  member: MemberPayload;
  commentId: string;
  body: IDiscussionBoardComment.IUpdate;
}): Promise<IDiscussionBoardComment> {
  const comment = await MyGlobal.prisma.discussion_board_comments.findFirst({
    where: {
      id: props.commentId,
      deleted_at: null,
    },
    select: {
      id: true,
      content: true,
      author_id: true,
      article_id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      author: {
        select: {
          id: true,
          email: true,
          display_name: true,
          bio: true,
          is_active: true,
          is_admin: true,
          is_super_admin: true,
          created_at: true,
          updated_at: true,
        },
      },
      article: {
        select: {
          id: true,
        },
      },
    },
  });
  if (comment === null) {
    throw new HttpException("Comment not found", 404);
  }
  if (comment.author_id !== props.member.id) {
    throw new HttpException(
      "You are not authorized to update this comment",
      403,
    );
  }
  const updated = await MyGlobal.prisma.discussion_board_comments.update({
    where: {
      id: props.commentId,
    },
    data: {
      content: props.body.content,
      updated_at: new Date(),
    },
    select: {
      id: true,
      content: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      author: {
        select: {
          id: true,
          email: true,
          display_name: true,
          bio: true,
          is_active: true,
          is_admin: true,
          is_super_admin: true,
          created_at: true,
          updated_at: true,
        },
      },
      article: {
        select: {
          id: true,
        },
      },
    },
  });
  return {
    id: updated.id,
    content: updated.content,
    author: {
      id: updated.author.id,
      email: updated.author.email,
      display_name: updated.author.display_name,
      bio: updated.author.bio,
      is_active: updated.author.is_active,
      is_admin: updated.author.is_admin,
      is_super_admin: updated.author.is_super_admin,
      created_at: toISOStringSafe(updated.author.created_at),
      updated_at: toISOStringSafe(updated.author.updated_at),
    },
    article_id: updated.article.id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
