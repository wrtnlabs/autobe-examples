import { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { CommunityPlatformPostTextTransformer } from "../transformers/CommunityPlatformPostTextTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformGuestPostsPostIdTexts(props: {
  guest: GuestPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostText> {
  // Query community_platform_post_texts joined with community_platform_posts filtering by postId and post_type='text'
  const record = await MyGlobal.prisma.community_platform_post_texts.findFirst({
    where: {
      community_platform_post_id: props.postId,
      deleted_at: null,
      post: {
        post_type: "text",
        deleted_at: null,
      },
    },
    ...CommunityPlatformPostTextTransformer.select(),
  });
  if (!record) {
    throw new HttpException(
      "Post text content not found or not of type text",
      404,
    );
  }
  return await CommunityPlatformPostTextTransformer.transform(record);
}
