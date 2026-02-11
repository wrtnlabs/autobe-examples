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

export async function patchRedditPlatformAdminRedditPlatformCommunitiesCommunityIdUsersUserIdBans(props: {
  admin: AdminPayload;
  communityId: string;
  userId: string;
  body: IRedditPlatformBan.ICreate;
}): Promise<IRedditPlatformBan> {
  // Check if already banned (before attempting create to avoid constraint error)
  const existingBan = await MyGlobal.prisma.reddit_platform_bans.findUnique({
    where: {
      community_id_user_id: {
        community_id: props.communityId,
        user_id: props.userId,
      },
    },
  });
  if (existingBan && existingBan.deleted_at === null) {
    throw new HttpException("User is already banned", 409);
  }
  // Check moderator permissions
  const moderation =
    await MyGlobal.prisma.reddit_platform_moderations.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.admin.id,
      },
    });
  if (!moderation) {
    throw new HttpException("Forbidden", 403);
  }
  // Create ban record
  const created = await MyGlobal.prisma.reddit_platform_bans.create({
    data: await RedditPlatformBanCollector.collect({
      body: {
        community_id: props.communityId,
        user_id: props.userId,
        reason: props.body.reason,
        expired_at: props.body.expired_at ?? null,
      },
      session: { id: props.admin.id },
    }),
    ...RedditPlatformBanTransformer.select(),
  });
  return await RedditPlatformBanTransformer.transform(created);
}
