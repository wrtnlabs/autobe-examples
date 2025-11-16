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

export async function postRedditCommunityRegisteredUserPostsPostIdPostImages(props: {
  registeredUser: RegisteredUserPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityPostImage.ICreate;
}): Promise<IRedditCommunityPostImage> {
  const nowIso: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.reddit_community_post_images.create({
    data: {
      id: v4(),
      reddit_community_post_id: props.postId,
      mime_type: props.body.mimeType,
      url: props.body.url,
      created_at: nowIso,
      updated_at: nowIso,
    },
  });

  return {
    id: created.id,
    postId: created.reddit_community_post_id satisfies string as string,
    mimeType: created.mime_type satisfies string as string,
    url: created.url,
    createdAt: toISOStringSafe(created.created_at),
    updatedAt: toISOStringSafe(created.updated_at),
  };
}
