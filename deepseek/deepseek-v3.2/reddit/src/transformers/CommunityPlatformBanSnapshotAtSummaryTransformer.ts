import { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import { ICommunityPlatformBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBanSnapshot";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

// Remove problematic import and use neighbor transformer reference
// The neighbor transformers list shows CommunityPlatformMemberAtSummaryTransformer exists
export namespace CommunityPlatformBanSnapshotAtSummaryTransformer {
  export type Payload = Prisma.community_platform_ban_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        snapshot_reason: true,
        snapshot_banned_at: true,
        snapshot_expires_at: true,
        snapshot_unbanned_at: true,
        snapshot_active: true,
        created_at: true,
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
        } satisfies Prisma.community_platform_bansFindManyArgs,
      },
    } satisfies Prisma.community_platform_ban_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformBanSnapshot.ISummary> {
    return {
      id: input.id,
      snapshotReason: input.snapshot_reason,
      snapshotBannedAt: input.snapshot_banned_at.toISOString(),
      snapshotExpiresAt: input.snapshot_expires_at
        ? input.snapshot_expires_at.toISOString()
        : null,
      snapshotUnbannedAt: input.snapshot_unbanned_at
        ? input.snapshot_unbanned_at.toISOString()
        : null,
      snapshotActive: input.snapshot_active,
      createdAt: input.created_at.toISOString(),
      ban: {
        id: input.ban.id,
        reason: input.ban.reason,
        banned_at: input.ban.banned_at.toISOString(),
        expires_at: input.ban.expires_at
          ? input.ban.expires_at.toISOString()
          : null,
        unbanned_at: input.ban.unbanned_at
          ? input.ban.unbanned_at.toISOString()
          : null,
        active: input.ban.active,
        banned_member: {
          id: input.ban.bannedMember.id,
          email: input.ban.bannedMember.email,
          username: input.ban.bannedMember.username,
          nickname: input.ban.bannedMember.nickname ?? undefined,
          email_verified: input.ban.bannedMember.email_verified,
          registered_at: input.ban.bannedMember.registered_at.toISOString(),
          last_login_at:
            input.ban.bannedMember.last_login_at?.toISOString() ?? undefined,
        } satisfies ICommunityPlatformMember.ISummary,
        moderator: {
          id: input.ban.issuingModeratorRole.member.id,
          email: input.ban.issuingModeratorRole.member.email,
          username: input.ban.issuingModeratorRole.member.username,
          nickname: input.ban.issuingModeratorRole.member.nickname ?? undefined,
          email_verified: input.ban.issuingModeratorRole.member.email_verified,
          registered_at:
            input.ban.issuingModeratorRole.member.registered_at.toISOString(),
          last_login_at:
            input.ban.issuingModeratorRole.member.last_login_at?.toISOString() ??
            undefined,
        } satisfies ICommunityPlatformMember.ISummary,
      } satisfies ICommunityPlatformBan.ISummary,
    };
  }
}
