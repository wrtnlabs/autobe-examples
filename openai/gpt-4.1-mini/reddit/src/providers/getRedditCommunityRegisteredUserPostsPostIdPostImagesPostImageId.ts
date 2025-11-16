import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function getRedditCommunityRegisteredUserPostsPostIdPostImagesPostImageId(props: {
  registeredUser: RegisteredUserPayload;
  postId: string & tags.Format<"uuid">;
  postImageId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityPostImage> {
  const image = await MyGlobal.prisma.reddit_community_post_images.findFirst({
    where: {
      id: props.postImageId,
      reddit_community_post_id: props.postId,
    },
  });

  if (!image) {
    throw new HttpException("Post image not found", 404);
  }

  return {
    id: image.id,
    postId: image.reddit_community_post_id,
    mimeType: image.mime_type,
    url: image.url,
    createdAt: toISOStringSafe(image.created_at),
    updatedAt: toISOStringSafe(image.updated_at),
  };
}
