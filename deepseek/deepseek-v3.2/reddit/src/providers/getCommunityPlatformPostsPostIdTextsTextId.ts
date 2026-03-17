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
  postId: string;
  textId: string;
}): Promise<ICommunityPlatformPostText> {
  const text =
    await MyGlobal.prisma.community_platform_post_texts.findFirstOrThrow({
      where: {
        id: props.textId,
        community_platform_post_id: props.postId,
        deleted_at: null,
      } satisfies Prisma.community_platform_post_textsWhereInput,
      ...CommunityPlatformPostTextTransformer.select(),
    });
  return await CommunityPlatformPostTextTransformer.transform(text);
}
