import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostImage";
import { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditClonePostImageAtSummaryTransformer } from "../transformers/RedditClonePostImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditClonePostsPostIdImages(props: {
  postId: string & tags.Format<"uuid">;
  body: IRedditClonePostImage.IRequest;
}): Promise<IPageIRedditClonePostImage.ISummary> {
  // Validate post exists
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true, post_type: true },
  });
  // If post is not image type, return empty list
  if (post.post_type !== "image") {
    return {
      pagination: {
        current: 1,
        limit: 20,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
      data: [],
    };
  }
  // Parse pagination parameters
  const page = props.body.page ?? 1;
  const pageSize = props.body.pageSize ?? 20;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * pageSize;
  // Query images with pagination
  const images = await MyGlobal.prisma.reddit_clone_post_images.findMany({
    where: {
      reddit_clone_post_id: props.postId,
      deleted_at: null,
    },
    skip,
    take: pageSize,
    orderBy: { sequence: "asc" },
    ...RedditClonePostImageAtSummaryTransformer.select(),
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.reddit_clone_post_images.count({
    where: {
      reddit_clone_post_id: props.postId,
      deleted_at: null,
    },
  });
  // Transform images
  const transformed = await ArrayUtil.asyncMap(
    images,
    RedditClonePostImageAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: pageSize,
      records: total,
      pages: Math.ceil(total / pageSize),
    } satisfies IPage.IPagination,
    data: transformed,
  };
}
