import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
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

export async function putCommunityPlatformMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformComment.IUpdate;
}): Promise<ICommunityPlatformComment> {
  const transactionResult = await MyGlobal.prisma.$transaction(async (tx) => {
    const comment = await tx.community_platform_comments.findUnique({
      where: { id: props.commentId },
      include: {
        member: true,
        parent: true,
        children: true,
      },
    });
    if (!comment) {
      throw new HttpException("Comment not found", 404);
    }
    if (comment.deleted_at !== null) {
      throw new HttpException("Comment deleted", 404);
    }
    if (comment.community_platform_member_id !== props.member.id) {
      throw new HttpException("Not authorized to update this comment", 403);
    }
    await tx.community_platform_comments.update({
      where: { id: props.commentId },
      data: {
        content: props.body.content,
        updated_at: toISOStringSafe(new Date()),
      },
    });
    return tx.community_platform_comments.findUnique({
      where: { id: props.commentId },
      include: {
        member: true,
        parent: true,
        children: true,
      },
    });
  });
  return typia.assert<ICommunityPlatformComment>(transactionResult);
}
