import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { IPageICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostImage";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchCommunityPlatformUserPostsPostIdImages(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostImage.IRequest;
}): Promise<IPageICommunityPlatformPostImage> {
  const { user, postId, body } = props;
  // 1. Verify post exists and is not soft-deleted
  const post = await MyGlobal.prisma.community_platform_posts.findFirst({
    where: { id: postId, deleted_at: null },
    select: { id: true },
  });
  if (!post) {
    throw new HttpException("Post not found or has been deleted", 404);
  }
  // 2. Pagination calculation
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  // 3. Get total count for pagination
  const total = await MyGlobal.prisma.community_platform_post_images.count({
    where: { community_platform_post_id: postId },
  });
  // 4. Query the images with correct orderBy inline logic
  const images = await MyGlobal.prisma.community_platform_post_images.findMany({
    where: { community_platform_post_id: postId },
    orderBy:
      body.sort_by === "file_size_bytes"
        ? { file_size_bytes: body.sort_order === "desc" ? "desc" : "asc" }
        : body.sort_by === "file_type"
          ? { file_type: body.sort_order === "desc" ? "desc" : "asc" }
          : { id: body.sort_order === "desc" ? "desc" : "asc" },
    skip,
    take: limit,
    select: {
      id: true,
      community_platform_post_id: true,
      uri: true,
      file_type: true,
      file_size_bytes: true,
    },
  });
  // 5. Build result list
  const data = images.map((img) => ({
    id: img.id,
    community_platform_post_id: img.community_platform_post_id,
    uri: img.uri,
    file_type: img.file_type,
    file_size_bytes: img.file_size_bytes,
  }));
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
