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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminCommentsCommentId(props: {
  superAdmin: SuperadminPayload;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.IUpdate;
}): Promise<IDiscussionBoardComment> {
  // Authorization: super admin can update any comment
  // Update the comment content and timestamp
  const updated = await MyGlobal.prisma.discussion_board_comments.update({
    where: { id: props.commentId },
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
      article_id: true,
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
    },
  });
  return {
    id: updated.id,
    content: updated.content,
    author: {
      id: updated.author.id,
      email: updated.author.email,
      display_name: updated.author.display_name,
      bio: updated.author.bio ?? undefined,
      is_active: updated.author.is_active,
      is_admin: updated.author.is_admin,
      is_super_admin: updated.author.is_super_admin,
      created_at: updated.author.created_at.toISOString(),
      updated_at: updated.author.updated_at.toISOString(),
    } satisfies IDiscussionBoardMember.ISummary,
    article_id: updated.article_id,
    created_at: updated.created_at.toISOString(),
    updated_at: updated.updated_at.toISOString(),
    deleted_at: updated.deleted_at?.toISOString() ?? null,
  };
}
