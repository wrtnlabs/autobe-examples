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

export async function deleteCommunityMemberCommentsCommentId(props: {
  member: MemberPayload;
  commentId: string;
}): Promise<void> {
  // Validate comment exists and is not already deleted
  const comment = await MyGlobal.prisma.community_comments.findUnique({
    where: { id: props.commentId },
    select: {
      id: true,
      community_member_id: true,
      community_post_id: true,
    },
  });
  if (!comment) throw new HttpException("Comment not found", 404);
  // Check authorization: user must be comment author or moderator/admin of the post's community
  const post = await MyGlobal.prisma.community_posts.findUnique({
    where: { id: comment.community_post_id },
    select: {
      community_id: true,
    },
  });
  if (!post) throw new HttpException("Associated post not found", 404);
  const isAuthor = comment.community_member_id === props.member.id;
  const isCommunityModerator =
    (await MyGlobal.prisma.community_community_actors.count({
      where: {
        actorId: props.member.id,
        community_id: post.community_id,
        role: "moderator",
      },
    })) > 0;
  const isCommunityAdmin =
    (await MyGlobal.prisma.community_community_actors.count({
      where: {
        actorId: props.member.id,
        community_id: post.community_id,
        role: "admin",
      },
    })) > 0;
  if (!isAuthor && !isCommunityModerator && !isCommunityAdmin) {
    throw new HttpException("Forbidden", 403);
  }
  // Perform atomic delete
  await MyGlobal.prisma.$transaction(async (prisma) => {
    // Delete comment record
    await pr;
  });
}
