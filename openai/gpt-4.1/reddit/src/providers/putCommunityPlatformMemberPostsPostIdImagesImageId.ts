import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putCommunityPlatformMemberPostsPostIdImagesImageId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostImage.IUpdate;
}): Promise<ICommunityPlatformPostImage> {
  // Fetch the image association row
  const image = await MyGlobal.prisma.community_platform_post_images.findUnique(
    {
      where: { id: props.imageId },
    },
  );
  if (!image || image.community_platform_post_id !== props.postId) {
    throw new HttpException(
      "Image association not found for the given post.",
      404,
    );
  }
  // Fetch the parent post to verify ownership
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
  });
  if (!post) {
    throw new HttpException("Post not found.", 404);
  }
  // Authorization: only creator can update ordering
  if (post.community_platform_member_id !== props.member.id) {
    throw new HttpException(
      "Forbidden: Only the post owner can update images.",
      403,
    );
  }
  // Prevent duplicate ordering (unique per post)
  const duplicate =
    await MyGlobal.prisma.community_platform_post_images.findFirst({
      where: {
        community_platform_post_id: props.postId,
        ordering: props.body.ordering,
        NOT: { id: props.imageId },
      },
    });
  if (duplicate) {
    throw new HttpException("Duplicate image ordering for this post.", 409);
  }
  // Update ordering only
  const updated = await MyGlobal.prisma.community_platform_post_images.update({
    where: { id: props.imageId },
    data: { ordering: props.body.ordering },
  });
  return {
    id: updated.id,
    community_platform_post_id: updated.community_platform_post_id,
    community_platform_file_upload_id:
      updated.community_platform_file_upload_id,
    ordering: updated.ordering,
  };
}
