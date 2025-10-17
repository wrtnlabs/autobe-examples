import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteCommunityPlatformMemberPostsPostIdImagesImageId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Fetch post image and verify it belongs to the correct post
  const postImage =
    await MyGlobal.prisma.community_platform_post_images.findUnique({
      where: { id: props.imageId },
      select: { id: true, community_platform_post_id: true },
    });
  if (!postImage || postImage.community_platform_post_id !== props.postId) {
    throw new HttpException("Not Found: Image is not linked to the post.", 404);
  }

  // 2. Fetch the post to check ownership and get community id
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
    select: {
      id: true,
      community_platform_member_id: true,
      community_platform_community_id: true,
    },
  });
  if (!post) {
    throw new HttpException("Not Found: Post does not exist.", 404);
  }

  // 3. Check member is post author OR a moderator of the community
  let authorized = false;
  if (post.community_platform_member_id === props.member.id) {
    authorized = true;
  } else {
    // Check if member is a moderator of this post's community (active, non-ended)
    const mod =
      await MyGlobal.prisma.community_platform_community_moderator_assignments.findFirst(
        {
          where: {
            community_id: post.community_platform_community_id,
            member_id: props.member.id,
            end_at: null,
          },
          select: { id: true },
        },
      );
    if (mod) {
      authorized = true;
    }
  }
  if (!authorized) {
    throw new HttpException(
      "Forbidden: You do not have permission to delete this image.",
      403,
    );
  }

  // 4. Delete physically (no soft delete on schema)
  await MyGlobal.prisma.community_platform_post_images.delete({
    where: { id: props.imageId },
  });
}
