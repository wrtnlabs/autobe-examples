import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityWiki } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityWiki";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityWikiTransformer } from "../transformers/CommunityPlatformCommunityWikiTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformCommunitiesCommunityIdWikisWikiId(props: {
  communityId: string & tags.Format<"uuid">;
  wikiId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityWiki> {
  const wiki =
    await MyGlobal.prisma.community_platform_community_wikis.findUniqueOrThrow({
      where: {
        id: props.wikiId,
        community_platform_community_id: props.communityId,
        deleted_at: null,
      },
      ...CommunityPlatformCommunityWikiTransformer.select(),
    });
  return await CommunityPlatformCommunityWikiTransformer.transform(wiki);
}
