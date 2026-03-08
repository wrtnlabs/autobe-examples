import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformPostImageAtSummaryTransformer } from "../transformers/CommunityPlatformPostImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformPostsPostIdImages(props: {
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostImage.IRequest;
}): Promise<IPageICommunityPlatformPostImage.ISummary> {
  // Verify post exists and is not deleted
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: {
        id: props.postId,
        deleted_at: null,
      },
      select: { id: true, content_type: true },
    },
  );
  // Return empty list for non-image posts
  if (post.content_type !== "image") {
    return {
      data: [],
      pagination: {
        current: 1,
        limit: 20,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  // Pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Query post images with file metadata and versions
  const images = await MyGlobal.prisma.community_platform_post_images.findMany({
    where: {
      community_platform_post_id: props.postId,
    },
    ...CommunityPlatformPostImageAtSummaryTransformer.select(),
    orderBy: { order: "asc" },
    skip,
    take: limit,
  });
  // Get total count
  const total = await MyGlobal.prisma.community_platform_post_images.count({
    where: {
      community_platform_post_id: props.postId,
    },
  });
  // Transform and return
  return {
    data: await ArrayUtil.asyncMap(
      images,
      CommunityPlatformPostImageAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
