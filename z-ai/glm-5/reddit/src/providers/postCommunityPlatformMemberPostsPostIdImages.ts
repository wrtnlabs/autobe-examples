import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformPostImageAtSummaryTransformer } from "../transformers/CommunityPlatformPostImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberPostsPostIdImages(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostImage.ICreate;
}): Promise<ICommunityPlatformPostImage.ISummary> {
  // 1. Validate post exists, author matches, content_type is 'image'
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: { id: true, author_id: true, content_type: true },
    },
  );
  if (post.author_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (post.content_type !== "image") {
    throw new HttpException("Post content type must be 'image'", 400);
  }
  // 2. Parse fileUrl and validate file
  const url = new URL(props.body.fileUrl);
  const fileId = url.pathname.split("/").filter(Boolean).pop()!;
  const file = await MyGlobal.prisma.community_platform_files.findUniqueOrThrow(
    {
      where: { id: fileId },
      select: {
        id: true,
        member_id: true,
        file_type: true,
        mime_type: true,
        file_size: true,
        post_id: true,
        deleted_at: true,
      },
    },
  );
  if (file.member_id !== props.member.id) {
    throw new HttpException("File not owned by member", 403);
  }
  if (file.file_type !== "post_image") {
    throw new HttpException("File type must be 'post_image'", 400);
  }
  const validMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!validMimeTypes.includes(file.mime_type)) {
    throw new HttpException("Invalid MIME type", 400);
  }
  const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
  if (file.file_size > MAX_FILE_SIZE) {
    throw new HttpException("File size exceeds 20MB limit", 400);
  }
  // Check if already attached to this post
  const existingImage =
    await MyGlobal.prisma.community_platform_post_images.findFirst({
      where: {
        community_platform_post_id: props.postId,
        community_platform_file_id: fileId,
      },
    });
  if (existingImage !== null) {
    throw new HttpException("Image already attached to this post", 409);
  }
  // 3. Storage quota check (500MB)
  const STORAGE_QUOTA = 500 * 1024 * 1024; // 500MB
  const currentUsage = await MyGlobal.prisma.community_platform_files.aggregate(
    {
      where: {
        member_id: props.member.id,
        file_type: "post_image",
        deleted_at: null,
      },
      _sum: { file_size: true },
    },
  );
  const totalSize = (currentUsage._sum.file_size ?? 0) + file.file_size;
  if (totalSize > STORAGE_QUOTA) {
    throw new HttpException("Storage quota exceeded (500MB limit)", 403);
  }
  // 4. Order assignment
  let order: number;
  if (props.body.order !== undefined) {
    const conflict =
      await MyGlobal.prisma.community_platform_post_images.findFirst({
        where: {
          community_platform_post_id: props.postId,
          order: props.body.order,
        },
      });
    if (conflict !== null) {
      throw new HttpException("Order position already taken", 400);
    }
    order = props.body.order;
  } else {
    const maxOrder =
      await MyGlobal.prisma.community_platform_post_images.aggregate({
        where: { community_platform_post_id: props.postId },
        _max: { order: true },
      });
    order = (maxOrder._max.order ?? -1) + 1;
  }
  // 5. Create record and update file.post_id
  const imageId = v4();
  const now = new Date();
  await MyGlobal.prisma.community_platform_post_images.create({
    data: {
      id: imageId,
      community_platform_post_id: props.postId,
      community_platform_file_id: fileId,
      order,
      created_at: now,
    },
  });
  if (file.post_id === null) {
    await MyGlobal.prisma.community_platform_files.update({
      where: { id: fileId },
      data: { post_id: props.postId, updated_at: now },
    });
  }
  // 6. Fetch and transform response
  const created =
    await MyGlobal.prisma.community_platform_post_images.findUniqueOrThrow({
      where: { id: imageId },
      ...CommunityPlatformPostImageAtSummaryTransformer.select(),
    });
  return CommunityPlatformPostImageAtSummaryTransformer.transform(created);
}
