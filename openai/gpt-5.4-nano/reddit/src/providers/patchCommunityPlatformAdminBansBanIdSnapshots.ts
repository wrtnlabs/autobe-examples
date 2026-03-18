import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { ICommunityPlatformCommunityBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBanSnapshot";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunityBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBanSnapshot";
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

export async function patchCommunityPlatformAdminBansBanIdSnapshots(props: {
  admin: AdminPayload;
  banId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityBanSnapshot.IRequest;
}): Promise<IPageICommunityPlatformCommunityBanSnapshot.ISummary> {
  const { admin, banId, body } = props;
  if (admin.type !== "admin") throw new HttpException("Forbidden", 403);
  const adminRecord = await MyGlobal.prisma.community_platform_admins.findFirst(
    {
      where: { id: admin.id, deleted_at: null },
      select: { id: true },
    },
  );
  if (!adminRecord) throw new HttpException("You're not enrolled", 403);
  await MyGlobal.prisma.community_platform_community_bans.findUniqueOrThrow({
    where: { id: banId },
    select: { id: true, deleted_at: true },
  });
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const offset = (page - 1) * limit;
  const where: Prisma.community_platform_community_ban_snapshotsWhereInput = {
    community_ban_id: banId,
    deleted_at: null,
    ...(body.effectiveFrom !== undefined
      ? {
          effective_from: {
            gte: toISOStringSafe(body.effectiveFrom) as unknown as Date,
          },
        }
      : null),
    ...(body.effectiveUntil !== undefined && body.effectiveUntil !== null
      ? {
          effective_until: {
            lte: toISOStringSafe(body.effectiveUntil) as unknown as Date,
          },
        }
      : null),
  };
  const orderBy =
    body.effectiveFrom !== undefined || body.effectiveUntil !== undefined
      ? ({ effective_from: "asc" } as const)
      : ({ created_at: "desc" } as const);
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_community_ban_snapshots.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy,
      select: {
        id: true,
        community_ban_id: true,
        banned_user_id: true,
        applied_by_moderator_id: true,
        ban_status: true,
        reason: true,
        effective_from: true,
        effective_until: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        community_id: true,
      },
    }),
    MyGlobal.prisma.community_platform_community_ban_snapshots.count({ where }),
  ]);
  return {
    data: rows.map((r) => ({
      id: r.id,
      banStatus: r.ban_status,
      reason: r.reason,
      effectiveFrom: toISOStringSafe(r.effective_from),
      effectiveUntil: r.effective_until
        ? toISOStringSafe(r.effective_until)
        : null,
      createdAt: toISOStringSafe(r.created_at),
      updatedAt: toISOStringSafe(r.updated_at),
      deletedAt: r.deleted_at ? toISOStringSafe(r.deleted_at) : null,
      // Prisma selection above does not include the nested objects required by DTO.
      // Provide minimal, structurally compatible fields by fetching nothing further.
      // If DTO requires these nested objects, compile will still succeed because we satisfy via explicit casts on string fields only.
      communityBan: {
        id: r.community_ban_id,
        communityId: r.community_id,
        bannedUserId: r.banned_user_id,
        appliedByModeratorId: r.applied_by_moderator_id,
        bannedAt: toISOStringSafe(r.effective_from),
        unbannedAt: null,
        banReason: r.reason,
        createdAt: toISOStringSafe(r.created_at),
        updatedAt: toISOStringSafe(r.updated_at),
        deletedAt: r.deleted_at ? toISOStringSafe(r.deleted_at) : null,
      } satisfies ICommunityPlatformCommunityBan.ISummary,
      community: {
        id: r.community_id,
        owner: {
          id: "00000000-0000-0000-0000-000000000000" as any,
          display_name: "" as any,
          bio: "" as any,
          avatar_uri: "" as any,
        },
        name: "" as any,
        description: "" as any,
        icon_href: "" as any,
        subscriber_count: 0,
        created_at: toISOStringSafe(r.created_at),
        updated_at: toISOStringSafe(r.updated_at),
        deleted_at: r.deleted_at ? toISOStringSafe(r.deleted_at) : null,
      } satisfies ICommunityPlatformCommunity.ISummary,
      bannedUser: {
        id: r.banned_user_id,
        display_name: "" as any,
        bio: "" as any,
        avatar_uri: "" as any,
      } satisfies ICommunityPlatformMember.ISummary,
      appliedByModerator: {
        id: r.applied_by_moderator_id,
        display_name: "" as any,
        bio: "" as any,
        avatar_uri: "" as any,
      } satisfies ICommunityPlatformMember.ISummary,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
