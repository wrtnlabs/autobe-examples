import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { IRedditPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBan";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformBanTransformer } from "../transformers/RedditPlatformBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformMemberRedditPlatformBansBanId(props: {
  member: MemberPayload;
  banId: string;
}): Promise<IRedditPlatformBan> {
  const ban = await MyGlobal.prisma.reddit_platform_bans.findUnique({
    where: { id: props.banId },
    ...RedditPlatformBanTransformer.select(),
  });
  if (!ban) throw new HttpException("Ban not found", 404);
  return await RedditPlatformBanTransformer.transform(ban);
}
