import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformBanTransformer } from "../transformers/CommunityPlatformBanTransformer";

export async function getCommunityPlatformModeratorModerationBansBanId(props: {
  moderator: ModeratorPayload;
  banId: string;
}): Promise<ICommunityPlatformBan> {
  const ban = await MyGlobal.prisma.community_platform_bans.findUnique({
    where: { id: props.banId },
    ...CommunityPlatformBanTransformer.select(),
  });
  if (!ban) {
    throw new HttpException("Ban not found", 404);
  }
  return await CommunityPlatformBanTransformer.transform(ban);
}
