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
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { CommunityPlatformBanTransformer } from "../transformers/CommunityPlatformBanTransformer";

export async function getCommunityPlatformOwnerModerationBansBanId(props: {
  owner: OwnerPayload;
  banId: string;
}): Promise<ICommunityPlatformBan> {
  // Fetch the ban record using the provided banId
  const ban = await MyGlobal.prisma.community_platform_bans.findUnique({
    where: {
      id: props.banId,
    },
    ...CommunityPlatformBanTransformer.select(),
  });
  // If ban record doesn't exist, return 404
  if (!ban) {
    throw new HttpException("Ban not found", 404);
  }
  // Transform the database result to the API response DTO
  return await CommunityPlatformBanTransformer.transform(ban);
}
