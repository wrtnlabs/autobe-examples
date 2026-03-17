import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformPostTextTransformer } from "../transformers/CommunityPlatformPostTextTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformPostsPostIdTextsTextId(props: {
  postId: string & tags.Format<"uuid">;
  textId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostText> {
  const record =
    await MyGlobal.prisma.community_platform_post_texts.findFirstOrThrow({
      where: {
        id: props.textId,
        community_platform_post_id: props.postId,
        deleted_at: null,
        post: {
          id: props.postId,
          post_type: "text",
          deleted_at: null,
        },
      },
      ...CommunityPlatformPostTextTransformer.select(),
    });
  if (record.post.status !== "active") {
    throw new HttpException("Not Found", 404);
  }
  return await CommunityPlatformPostTextTransformer.transform(record);
}
