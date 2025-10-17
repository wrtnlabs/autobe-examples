import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteCommunityPlatformMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find post (only if active/not already deleted)
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      community_platform_member_id: true,
      deleted_at: true,
    },
  });
  if (!post) {
    throw new HttpException("해당 포스트를 찾을 수 없습니다.", 404);
  }

  // 2. Ownership: Only author may delete via this endpoint
  if (post.community_platform_member_id !== props.member.id) {
    throw new HttpException("본인 작성 글만 삭제할 수 있습니다.", 403);
  }

  // 3. Soft-delete by setting deleted_at
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_platform_posts.update({
    where: { id: props.postId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
