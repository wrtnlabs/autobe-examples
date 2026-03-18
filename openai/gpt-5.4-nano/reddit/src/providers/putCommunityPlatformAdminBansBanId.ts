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

export async function putCommunityPlatformAdminBansBanId(props: {
  admin: AdminPayload;
  banId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityBan.IUpdate;
}): Promise<ICommunityPlatformCommunityBan> {
  const nowIso = toISOStringSafe(new Date());
  const ban =
    await MyGlobal.prisma.community_platform_community_bans.findUniqueOrThrow({
      where: { id: props.banId, deleted_at: null },
      select: {
        id: true,
        community_id: true,
        banned_user_id: true,
        applied_by_moderator_id: true,
        banned_at: true,
        unbanned_at: true,
        ban_reason: true,
        deleted_at: true,
      },
    });
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: ban.community_id, deleted_at: null },
      select: { id: true, community_owner_id: true },
    });
  const isOwner = community.community_owner_id === props.admin.id;
  const moderator = isOwner
    ? null
    : await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          community_id: community.id,
          moderator_user_id: props.admin.id,
          deleted_at: null,
        },
        select: { id: true },
      });
  if (!isOwner && moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  const intendsUnban = props.body.action === "unban";
  if (intendsUnban && ban.unbanned_at !== null) {
    throw new HttpException("Unban requested for non-banned user", 400);
  }
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const freshBan =
      await prisma.community_platform_community_bans.findUniqueOrThrow({
        where: { id: props.banId, deleted_at: null },
        select: {
          id: true,
          community_id: true,
          banned_user_id: true,
          applied_by_moderator_id: true,
          banned_at: true,
          unbanned_at: true,
          ban_reason: true,
        },
      });
    if (intendsUnban && freshBan.unbanned_at !== null) {
      throw new HttpException("Unban requested for non-banned user", 400);
    }
    const willBeActive = !intendsUnban;
    const updated = await prisma.community_platform_community_bans.update({
      where: { id: props.banId },
      data: {
        applied_by_moderator_id: props.admin.id,
        ban_reason: props.body.ban_reason,
        updated_at: nowIso,
        ...(intendsUnban
          ? { unbanned_at: nowIso }
          : {
              unbanned_at: null,
              ...(freshBan.unbanned_at === null ? {} : { banned_at: nowIso }),
            }),
      },
      select: {
        id: true,
        community_id: true,
        banned_user_id: true,
        applied_by_moderator_id: true,
        banned_at: true,
        unbanned_at: true,
        ban_reason: true,
        deleted_at: true,
        created_at: true,
        updated_at: true,
        snapshots: false,
      },
    });
    await prisma.community_platform_community_ban_snapshots.create({
      data: {
        id: v4(),
        community_ban_id: updated.id,
        community_id: updated.community_id,
        banned_user_id: updated.banned_user_id,
        applied_by_moderator_id: updated.applied_by_moderator_id,
        ban_status: willBeActive ? "active" : "lifted",
        reason: props.body.ban_reason,
        effective_from: toISOStringSafe(updated.banned_at),
        effective_until: willBeActive
          ? null
          : updated.unbanned_at === null
            ? null
            : toISOStringSafe(updated.unbanned_at),
        created_at: nowIso,
        updated_at: nowIso,
        deleted_at: null,
      },
    });
    const refreshed =
      await prisma.community_platform_community_bans.findUniqueOrThrow({
        where: { id: props.banId },
        ...CommunityPlatformCommunityBanTransformer.select(),
      });
    return await CommunityPlatformCommunityBanTransformer.transform(refreshed);
  });
}
