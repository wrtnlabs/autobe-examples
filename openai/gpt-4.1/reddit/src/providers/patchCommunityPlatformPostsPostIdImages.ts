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

export async function patchCommunityPlatformPostsPostIdImages(props: {
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostImage.IRequest;
}): Promise<IPageICommunityPlatformPostImage> {
  // Fetch the parent post and validate existence & not soft-deleted
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
    select: { id: true, deleted_at: true },
  });
  if (!post || post.deleted_at !== null) {
    throw new HttpException("Post not found or has been deleted.", 404);
  }

  // Build filters
  const where = {
    community_platform_post_id: props.postId,
    ...(props.body.ordering !== undefined
      ? { ordering: props.body.ordering }
      : {}),
  };
  // Query images; by platform rule maximum of 10 images per post, but not enforced in select logic
  const images = await MyGlobal.prisma.community_platform_post_images.findMany({
    where,
    orderBy: { ordering: "asc" },
  });

  // Map records to DTO
  const data = images.map((image) => ({
    id: image.id,
    community_platform_post_id: image.community_platform_post_id,
    community_platform_file_upload_id: image.community_platform_file_upload_id,
    ordering: image.ordering,
  }));

  // Pagination metadata: all images fit on one page as default
  return {
    pagination: {
      current: 1,
      limit: data.length,
      records: data.length,
      pages: 1,
    },
    data,
  };
}
