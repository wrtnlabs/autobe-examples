import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditClonePostImageTransformer } from "../transformers/RedditClonePostImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditClonePostsPostIdImagesImageId(props: {
  postId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IRedditClonePostImage> {
  const image =
    await MyGlobal.prisma.reddit_clone_post_images.findUniqueOrThrow({
      where: {
        id: props.imageId,
      },
      ...RedditClonePostImageTransformer.select(),
    });
  if (image.deleted_at !== null) {
    throw new HttpException("Image not found", 404);
  }
  if (image.post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  if (image.post.id !== props.postId) {
    throw new HttpException("Image not found", 404);
  }
  return await RedditClonePostImageTransformer.transform(image);
}
