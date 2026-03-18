import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformCommunityBanAtSummaryTransformer {
  export type Payload = Prisma.community_platform_community_bansGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        community_id: true,
        banned_user_id: true,
        applied_by_moderator_id: true,
        banned_at: true,
        unbanned_at: true,
        ban_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        community: { select: { id: true } },
        bannedUser: { select: { id: true } },
        appliedByModerator: { select: { id: true } },
        snapshots: { select: { id: true } },
      },
    } satisfies Prisma.community_platform_community_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommunityBan.ISummary> {
    return {
      id: input.id,
      communityId: input.community_id,
      bannedUserId: input.banned_user_id,
      appliedByModeratorId: input.applied_by_moderator_id,
      bannedAt: input.banned_at.toISOString(),
      unbannedAt: input.unbanned_at ? input.unbanned_at.toISOString() : null,
      banReason: input.ban_reason,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
