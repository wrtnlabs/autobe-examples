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

export async function postCommunityPlatformMemberPostsPostIdImages(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostImage.ICreate;
}): Promise<ICommunityPlatformPostImage> {
  const { member, postId, body } = props;

  // 1. Fetch the post, check ownership.
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: postId },
  });
  if (!post || post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  if (post.community_platform_member_id !== member.id) {
    throw new HttpException("Only the post author can attach images", 403);
  }

  // 2. File upload record validation.
  const fileUpload =
    await MyGlobal.prisma.community_platform_file_uploads.findUnique({
      where: { id: body.community_platform_file_upload_id },
    });
  if (!fileUpload || fileUpload.deleted_at !== null) {
    throw new HttpException(
      "Referenced image does not exist or was deleted",
      400,
    );
  }
  if (fileUpload.status !== "active") {
    throw new HttpException("File is not available for attachment", 400);
  }

  // 3. Enforce max images (10 per post).
  const imageCount = await MyGlobal.prisma.community_platform_post_images.count(
    {
      where: { community_platform_post_id: postId },
    },
  );
  if (imageCount >= 10) {
    throw new HttpException(
      "This post already has the maximum allowed images (10)",
      409,
    );
  }

  // 4. Ensure ordering is unique for this post.
  const existingOrder =
    await MyGlobal.prisma.community_platform_post_images.findFirst({
      where: {
        community_platform_post_id: postId,
        ordering: body.ordering,
      },
    });
  if (existingOrder) {
    throw new HttpException(
      `The specified ordering (${body.ordering}) is already used for this post.`,
      409,
    );
  }
  // 5. Ensure file_upload_id not already used for this post.
  const dupeImage =
    await MyGlobal.prisma.community_platform_post_images.findFirst({
      where: {
        community_platform_post_id: postId,
        community_platform_file_upload_id:
          body.community_platform_file_upload_id,
      },
    });
  if (dupeImage) {
    throw new HttpException(
      "This image file is already attached to the post.",
      409,
    );
  }

  // 6. Insert image record.
  const created = await MyGlobal.prisma.community_platform_post_images.create({
    data: {
      id: v4(),
      community_platform_post_id: postId,
      community_platform_file_upload_id: body.community_platform_file_upload_id,
      ordering: body.ordering,
    },
  });

  // 7. Return response structure (no Date fields to transform).
  return {
    id: created.id,
    community_platform_post_id: created.community_platform_post_id,
    community_platform_file_upload_id:
      created.community_platform_file_upload_id,
    ordering: created.ordering,
  };
}
