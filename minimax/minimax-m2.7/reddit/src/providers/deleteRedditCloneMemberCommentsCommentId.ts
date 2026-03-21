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

export async function deleteRedditCloneMemberCommentsCommentId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find the comment with ownership info
  const comment = await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow(
    {
      where: { id: props.commentId },
      select: {
        id: true,
        reddit_clone_member_id: true,
        deleted_at: true,
      },
    },
  );
  // 2. Check if comment is already deleted
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment not found", 404);
  }
  // 3. Verify the requesting member is the author
  if (comment.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Soft delete - set deleted_at timestamp
  await MyGlobal.prisma.reddit_clone_comments.update({
    where: { id: props.commentId },
    data: { deleted_at: new Date() },
  });
}
