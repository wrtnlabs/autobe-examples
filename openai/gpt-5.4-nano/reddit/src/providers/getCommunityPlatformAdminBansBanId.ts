import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommunityBanTransformer } from "../transformers/CommunityPlatformCommunityBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminBansBanId(props: {
  admin: AdminPayload;
  banId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityBan> {
  const ban =
    await MyGlobal.prisma.community_platform_community_bans.findUnique({
      where: { id: props.banId },
      select: { id: true, community_id: true, deleted_at: true },
    });
  if (ban === null || ban.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: ban.community_id },
      select: { community_owner_id: true, id: true },
    });
  const isOwner = community.community_owner_id === props.admin.id;
  const isModerator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_id: ban.community_id,
        moderator_user_id: props.admin.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!isOwner && isModerator === null) {
    throw new HttpException("Forbidden", 403);
  }
  const loaded =
    await MyGlobal.prisma.community_platform_community_bans.findUniqueOrThrow({
      where: { id: props.banId },
      ...CommunityPlatformCommunityBanTransformer.select(),
    });
  return await CommunityPlatformCommunityBanTransformer.transform(loaded);
}
