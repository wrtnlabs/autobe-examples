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

export async function putRedditCommunityRegisteredUserPostsPostIdPostImagesPostImageId(props: {
  registeredUser: RegisteredUserPayload;
  postId: string & tags.Format<"uuid">;
  postImageId: string & tags.Format<"uuid">;
  body: IRedditCommunityPostImage.IUpdate;
}): Promise<IRedditCommunityPostImage> {
  const existing =
    await MyGlobal.prisma.reddit_community_post_images.findUnique({
      where: { id: props.postImageId },
    });
  if (!existing) {
    throw new HttpException("Post image not found", 404);
  }

  if (
    (existing.reddit_community_post_id satisfies string as string) !==
    (props.postId satisfies string as string)
  ) {
    throw new HttpException(
      "Post image not associated with specified post",
      403,
    );
  }

  const updated = await MyGlobal.prisma.reddit_community_post_images.update({
    where: { id: props.postImageId },
    data: {
      mime_type: props.body.mimeType,
      url: props.body.url,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    postId: updated.reddit_community_post_id satisfies string as string,
    mimeType: updated.mime_type,
    url: updated.url,
    createdAt: toISOStringSafe(updated.created_at),
    updatedAt: toISOStringSafe(updated.updated_at),
  };
}
