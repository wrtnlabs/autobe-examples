import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditPlatformCommunityBanTransformer } from "../transformers/RedditPlatformCommunityBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformAdminBansBanId(props: {
  admin: AdminPayload;
  banId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformCommunityBan> {
  const ban =
    await MyGlobal.prisma.reddit_platform_community_bans.findUniqueOrThrow({
      where: { id: props.banId },
      ...RedditPlatformCommunityBanTransformer.select(),
    });
  return await RedditPlatformCommunityBanTransformer.transform(ban);
}
