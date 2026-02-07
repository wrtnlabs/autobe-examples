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

export async function deleteCommunityMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const post = await MyGlobal.prisma.community_posts.findUnique({
    where: {
      id: props.postId,
    },
    select: {
      id: true,
      community_member_id: true,
      community_post_status_id: true,
      deleted_at: true,
    },
  });
  if (!post || post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  // Check if member is author
  if (post.community_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.community_post_statuses.update({
    where: {
      id: post.community_post_status_id,
    },
    data: {
      status: "deleted",
      updated_at: toISOStringSafe(new Date()),
    },
  });
  await MyGlobal.prisma.community_posts.update({
    where: {
      id: props.postId,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  return;
}
