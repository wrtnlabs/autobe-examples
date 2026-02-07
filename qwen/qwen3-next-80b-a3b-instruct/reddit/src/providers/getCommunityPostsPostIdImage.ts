import { ICommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPostsPostIdImage(props: {
  postId: string;
}): Promise<ICommunityPostImage> {
  const post = await MyGlobal.prisma.community_posts.findUnique({
    where: { id: props.postId },
    select: {
      id: true,
      content_type: true,
      deleted_at: true,
    },
  });
  if (!post) throw new HttpException("Post not found", 404);
  if (post.content_type !== "image")
    throw new HttpException("Post is not an image type", 404);
  if (post.deleted_at !== null)
    throw new HttpException("Post has been deleted", 404);
  // In AutoBE, authentication context is available via MyGlobal.context.customer
  if (!MyGlobal.context?.customer?.id)
    throw new HttpException("Forbidden", 403);
  const image = await MyGlobal.prisma.community_post_images.findUnique({
    where: { id: props.postId },
    select: {
      file_reference: true,
      thumbnail_reference: true,
      original_width: true,
      original_height: true,
      compressed_size: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!image) throw new HttpException("Image metadata not found", 404);
  return {
    file_reference: image.file_reference,
    thumbnail_reference: image.thumbnail_reference,
    original_width: image.original_width,
    original_height: image.original_height,
    compressed_size: image.compressed_size,
    created_at: toISOStringSafe(image.created_at),
    updated_at: toISOStringSafe(image.updated_at),
  };
}
