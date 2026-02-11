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
import { RedditPlatformBanCollector } from "../collectors/RedditPlatformBanCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditPlatformBanTransformer } from "../transformers/RedditPlatformBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformAdminRedditPlatformBans(props: {
  admin: AdminPayload;
  body: IRedditPlatformBan.ICreate;
}): Promise<IRedditPlatformBan> {
  // Check for existing ban
  const existingBan = await MyGlobal.prisma.reddit_platform_bans.findFirst({
    where: {
      community_id: props.body.community_id,
      user_id: props.body.user_id,
      deleted_at: null,
    },
  });
  if (existingBan !== null) {
    throw new HttpException("User is already banned from this community", 409);
  }
  const created = await MyGlobal.prisma.reddit_platform_bans.create({
    data: await RedditPlatformBanCollector.collect({
      body: props.body,
      session: { id: props.admin.id },
    }),
    ...RedditPlatformBanTransformer.select(),
  });
  return await RedditPlatformBanTransformer.transform(created);
}
