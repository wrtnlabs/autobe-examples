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
import { CommunityPlatformCommentTransformer } from "../transformers/CommunityPlatformCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformComment> {
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: {
      id: props.commentId,
      community_platform_member_id: props.member.id,
      deleted_at: null,
    },
    ...CommunityPlatformCommentTransformer.select(),
  });
  if (!comment) throw new HttpException("Comment not found", 404);
  await MyGlobal.prisma.community_platform_comments.update({
    where: { id: props.commentId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
  const updatedComment =
    await MyGlobal.prisma.community_platform_comments.findUnique({
      where: { id: props.commentId },
      ...CommunityPlatformCommentTransformer.select(),
    });
  if (!updatedComment) {
    throw new HttpException("Failed to update comment", 500);
  }
  return await CommunityPlatformCommentTransformer.transform(updatedComment);
}
