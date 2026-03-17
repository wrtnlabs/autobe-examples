import { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import { ICommunityPlatformBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBanSnapshot";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminCommunityIdBansBanIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  communityId: string;
  banId: string;
  snapshotId: string;
}): Promise<ICommunityPlatformBanSnapshot> {
  // Verify the ban belongs to the specified community
  const ban = await MyGlobal.prisma.community_platform_bans.findUniqueOrThrow({
    where: { id: props.banId },
    select: { id: true, community_id: true },
  });
  if (ban.community_id !== props.communityId) {
    throw new HttpException("Ban not found in this community", 404);
  }
  // Get the snapshot with all required data including ban relationship
  const snapshot =
    await MyGlobal.prisma.community_platform_ban_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      select: {
        id: true,
        community_platform_ban_id: true,
        snapshot_reason: true,
        snapshot_banned_at: true,
        snapshot_expires_at: true,
        snapshot_unbanned_at: true,
        snapshot_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        ban: {
          select: {
            id: true,
            reason: true,
            banned_at: true,
            expires_at: true,
            unbanned_at: true,
            active: true,
            bannedMember: {
              select: {
                id: true,
                email: true,
                username: true,
                nickname: true,
                email_verified: true,
                registered_at: true,
                last_login_at: true,
              },
            } satisfies Prisma.community_platform_membersFindManyArgs,
            issuingModeratorRole: {
              select: {
                member: {
                  select: {
                    id: true,
                    email: true,
                    username: true,
                    nickname: true,
                    email_verified: true,
                    registered_at: true,
                    last_login_at: true,
                  },
                } satisfies Prisma.community_platform_membersFindManyArgs,
              },
            } satisfies Prisma.community_platform_moderation_rolesFindManyArgs,
          },
        },
      },
    });
  // Verify snapshot belongs to the correct ban
  if (snapshot.community_platform_ban_id !== props.banId) {
    throw new HttpException("Snapshot not found for this ban", 404);
  }
  // Transform to DTO
  return {
    id: snapshot.id as string & tags.Format<"uuid">,
    ban: {
      id: snapshot.ban.id as string & tags.Format<"uuid">,
      reason: snapshot.ban.reason,
      banned_at: snapshot.ban.banned_at.toISOString(),
      expires_at: snapshot.ban.expires_at?.toISOString() ?? null,
      unbanned_at: snapshot.ban.unbanned_at?.toISOString() ?? null,
      active: snapshot.ban.active,
      banned_member: {
        id: snapshot.ban.bannedMember.id as string & tags.Format<"uuid">,
        email: snapshot.ban.bannedMember.email as string & tags.Format<"email">,
        username: snapshot.ban.bannedMember.username,
        nickname: snapshot.ban.bannedMember.nickname ?? undefined,
        email_verified: snapshot.ban.bannedMember.email_verified,
        registered_at: snapshot.ban.bannedMember.registered_at.toISOString(),
        last_login_at:
          snapshot.ban.bannedMember.last_login_at?.toISOString() ?? undefined,
      } satisfies ICommunityPlatformMember.ISummary,
      moderator: {
        id: snapshot.ban.issuingModeratorRole.member.id as string &
          tags.Format<"uuid">,
        email: snapshot.ban.issuingModeratorRole.member.email as string &
          tags.Format<"email">,
        username: snapshot.ban.issuingModeratorRole.member.username,
        nickname:
          snapshot.ban.issuingModeratorRole.member.nickname ?? undefined,
        email_verified: snapshot.ban.issuingModeratorRole.member.email_verified,
        registered_at:
          snapshot.ban.issuingModeratorRole.member.registered_at.toISOString(),
        last_login_at:
          snapshot.ban.issuingModeratorRole.member.last_login_at?.toISOString() ??
          undefined,
      } satisfies ICommunityPlatformMember.ISummary,
    } satisfies ICommunityPlatformBan.ISummary,
    snapshotReason: snapshot.snapshot_reason,
    snapshotBannedAt: snapshot.snapshot_banned_at.toISOString(),
    snapshotExpiresAt: snapshot.snapshot_expires_at?.toISOString() ?? null,
    snapshotUnbannedAt: snapshot.snapshot_unbanned_at?.toISOString() ?? null,
    snapshotActive: snapshot.snapshot_active,
    createdAt: snapshot.created_at.toISOString(),
    updatedAt: snapshot.updated_at.toISOString(),
    deletedAt: snapshot.deleted_at?.toISOString() ?? null,
  } satisfies ICommunityPlatformBanSnapshot;
}
