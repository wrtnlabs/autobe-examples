import { ICommunityPlatformCommunityBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBanSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformCommunityBanSnapshotTransformer {
  export type Payload =
    Prisma.community_platform_community_ban_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        community_ban_id: true,
        community_id: true,
        banned_user_id: true,
        applied_by_moderator_id: true,
        ban_status: true,
        reason: true,
        effective_from: true,
        effective_until: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.community_platform_community_ban_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommunityBanSnapshot> {
    return {
      id: input.id,
      community_ban_id: input.community_ban_id,
      community_id: input.community_id,
      banned_user_id: input.banned_user_id,
      applied_by_moderator_id: input.applied_by_moderator_id,
      ban_status: input.ban_status,
      reason: input.reason,
      effective_from: input.effective_from.toISOString(),
      effective_until: input.effective_until
        ? input.effective_until.toISOString()
        : null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
