import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformPostsPostIdImagesImageId(props: {
  postId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformPostImage.IAt> {
  const image =
    await MyGlobal.prisma.reddit_platform_post_images.findUniqueOrThrow({
      where: {
        id: props.imageId,
        post_id: props.postId,
      },
      select: {
        file_path: true,
        deleted_at: true,
      },
    });
  if (image.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  const post = await MyGlobal.prisma.reddit_platform_posts.findUnique({
    where: { id: props.postId },
  });
  if (post === null) {
    throw new HttpException("Not Found", 404);
  }
  return {
    imageUri: image.file_path,
  } satisfies IRedditPlatformPostImage.IAt;
}
