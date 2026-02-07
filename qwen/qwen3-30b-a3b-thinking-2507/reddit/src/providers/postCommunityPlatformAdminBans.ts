import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformModerationBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformModerationBanCollector } from "../collectors/CommunityPlatformModerationBanCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformModerationBanTransformer } from "../transformers/CommunityPlatformModerationBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminBans(props: {
  admin: AdminPayload;
  body: ICommunityPlatformModerationBan.ICreate;
}): Promise<ICommunityPlatformModerationBan> {
  const collected = await CommunityPlatformModerationBanCollector.collect({
    body: props.body,
  });
  const created =
    await MyGlobal.prisma.community_platform_moderation_bans.create({
      data: collected,
    });
  const user = await MyGlobal.prisma.community_platform_members.findUnique({
    where: { id: created.user_id },
  });
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: created.community_id },
      include: { owner: true },
    });
  const moderator = await MyGlobal.prisma.community_platform_admins.findUnique({
    where: { id: created.moderator_id },
  });
  const enriched = {
    ...created,
    user: user!,
    community: community!,
    moderator: moderator!,
  };
  return await CommunityPlatformModerationBanTransformer.transform(enriched);
}
