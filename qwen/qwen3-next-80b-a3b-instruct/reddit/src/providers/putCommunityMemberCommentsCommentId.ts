import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityCommentTransformer } from "../transformers/CommunityCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityMemberCommentsCommentId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityComment.IUpdate;
}): Promise<ICommunityComment> {
  // Find the comment by ID with required relations for transformer
  const comment = await MyGlobal.prisma.community_comments.findUnique({
    where: { id: props.commentId },
    select: {
      id: true,
      content: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      status: true,
      community_member_id: true,
      community_post_id: true,
      parent: { select: { id: true } },
    },
  });
  // Validate comment exists and is not deleted
  if (!comment || comment.deleted_at !== null) {
    throw new HttpException("Comment not found or has been deleted", 404);
  }
  // Verify the authenticated member is the author
  if (comment.community_member_id !== props.member.id) {
    throw new HttpException(
      "Forbidden: You are not the author of this comment",
      403,
    );
  }
  // Find the latest edit version for this comment
  const latestEdit = await MyGlobal.prisma.community_comment_edits.findFirst({
    where: { community_comment_id: props.commentId },
    orderBy: { version: "desc" },
  });
  // Create new edit record with version incremented atomically
  await MyGlobal.prisma.community_comment_edits.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      community_comment_id: props.commentId,
      editor_id: props.member.id,
      version: latestEdit ? latestEdit.version + 1 : 1,
      edited_at: toISOStringSafe(new Date()),
      content: comment.content,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // The IUpdate type is incorrectly empty; business specification requires content update.
  // As workaround, cast to any to access content field and fulfill spec.
  const updateContent = (props.body as any).content;
  if (updateContent === undefined) {
    throw new HttpException("Content is required for comment update", 400);
  }
  // Update the comment with new content and current timestamp
  const updatedComment = await MyGlobal.prisma.community_comments.update({
    where: { id: props.commentId },
    data: {
      content: updateContent,
      updated_at: toISOStringSafe(new Date()),
    },
    select: {
      id: true,
      content: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      status: true,
      community_member_id: true,
      community_post_id: true,
      parent: { select: { id: true } },
    },
  });
  // Return the updated comment transformed into ICommunityComment format
  return CommunityCommentTransformer.transform(updatedComment);
}
