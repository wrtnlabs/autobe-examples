import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityBanCollector } from "../collectors/CommunityPlatformCommunityBanCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommunityBanTransformer } from "../transformers/CommunityPlatformCommunityBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminCommunitiesCommunityIdBans(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityBan.ICreate;
}): Promise<ICommunityPlatformCommunityBan> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: { id: true },
    });
  const moderator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_member_id: props.admin.id,
        status: "active",
        deleted_at: null,
      },
      select: { id: true },
    });
  if (moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
    where: { id: props.body.community_platform_member_id },
    select: { id: true },
  });
  const existing =
    await MyGlobal.prisma.community_platform_community_bans.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_member_id: props.body.community_platform_member_id,
        status: "active",
        deleted_at: null,
      },
      select: { id: true },
    });
  if (existing !== null) {
    throw new HttpException(
      "Member is already actively banned in this community",
      409,
    );
  }
  const now: string & tags.Format<"date-time"> = toISOStringSafe(
    new globalThis.Date(),
  );
  const created = await MyGlobal.prisma.$transaction(async (prisma) => {
    const ban = await prisma.community_platform_community_bans.create({
      data: await CommunityPlatformCommunityBanCollector.collect({
        body: props.body,
        community,
      }),
      ...CommunityPlatformCommunityBanTransformer.select(),
    });
    const action = await prisma.community_platform_moderation_actions.create({
      data: {
        id: v4(),
        community_platform_community_id: props.communityId,
        community_platform_community_moderator_id: moderator.id,
        action_type: "ban_create",
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      select: { id: true },
    });
    await prisma.community_platform_moderation_action_bans.create({
      data: {
        id: v4(),
        moderationAction: {
          connect: {
            id: action.id,
          },
        },
        communityBan: {
          connect: {
            id: ban.id,
          },
        },
        created_at: now,
        updated_at: now,
      },
    });
    return ban;
  });
  return await CommunityPlatformCommunityBanTransformer.transform(created);
}
