import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
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
  commentId: string;
  body: ICommunityComment.IUpdate;
}): Promise<ICommunityComment> {
  // Find the comment with minimal fields for validation
  const comment = await MyGlobal.prisma.community_comments.findUniqueOrThrow({
    where: { id: props.commentId },
    select: {
      id: true,
      community_member_id: true,
      is_deleted: true,
    },
  });
  // Authorization check - must be the author
  if (comment.community_member_id !== props.member.id) {
    throw new HttpException("COMMENT_EDIT_UNAUTHORIZED", 403);
  }
  // Deletion check
  if (comment.is_deleted) {
    throw new HttpException("COMMENT_DELETED", 400);
  }
  // Content validation - strip whitespace and validate
  const content = (props.body.content ?? "").trim();
  if (content.length === 0) {
    throw new HttpException("COMMENT_EMPTY_CONTENT", 400);
  }
  if (content.length > 10000) {
    throw new HttpException("COMMENT_TOO_LONG", 400);
  }
  // Update the comment with new content and timestamps
  const now = new Date();
  const updated = await MyGlobal.prisma.community_comments.update({
    where: { id: props.commentId },
    data: {
      content,
      edited_at: now,
      updated_at: now,
    },
    ...CommunityCommentTransformer.select(),
  });
  return await CommunityCommentTransformer.transform(updated);
}
