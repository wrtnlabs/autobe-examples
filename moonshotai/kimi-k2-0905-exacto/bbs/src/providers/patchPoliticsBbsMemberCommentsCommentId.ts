import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticsBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsComment";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchPoliticsBbsMemberCommentsCommentId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  content: string & tags.MinLength<20> & tags.MaxLength<1000>;
  body: IPoliticsBbsComment.IUpdate;
}): Promise<IPoliticsBbsComment> {
  const { member, commentId, body } = props;

  // 1. Load comment with ownership via member subtype to validate ownership.
  const comment = await MyGlobal.prisma.politics_bbs_comments.findUnique({
    where: { id: commentId, deleted_at: null },
    include: { politics_bbs_comment_of_members: true },
  });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  // 2. Validate ownership: Only allow if this member owns the comment.
  const memberOwnerRel = comment.politics_bbs_comment_of_members;
  if (!memberOwnerRel || memberOwnerRel.politics_bbs_member_id !== member.id) {
    throw new HttpException("You can only edit your own comments", 403);
  }

  const updatedAt = toISOStringSafe(new Date());

  // 3. Update comment content and timestamp.
  const updated = await MyGlobal.prisma.politics_bbs_comments.update({
    where: { id: commentId },
    data: {
      content: body.content,
      updated_at: updatedAt satisfies string & tags.Format<"date-time">,
    },
  });

  // 4. Return the updated comment matching IPoliticsBbsComment.
  return {
    id: updated.id as string & tags.Format<"uuid">,
    politics_bbs_article_id: updated.politics_bbs_article_id as string &
      tags.Format<"uuid">,
    parent_id:
      updated.parent_id === null
        ? undefined
        : (updated.parent_id as (string & tags.Format<"uuid">) | undefined),
    content: updated.content,
    depth: updated.depth as number & tags.Type<"int32">,
    status: updated.status,
    actor_type: updated.actor_type,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: updatedAt,
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  } satisfies IPoliticsBbsComment;
}
