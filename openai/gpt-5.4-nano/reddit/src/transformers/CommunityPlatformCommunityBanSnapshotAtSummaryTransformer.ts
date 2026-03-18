import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { ICommunityPlatformCommunityBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBanSnapshot";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformCommunityBanAtSummaryTransformer } from "./CommunityPlatformCommunityBanAtSummaryTransformer";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";

export namespace CommunityPlatformCommunityBanSnapshotAtSummaryTransformer {
  export type Payload =
    Prisma.community_platform_community_ban_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        ban_status: true,
        reason: true,
        effective_from: true,
        effective_until: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        communityBan:
          CommunityPlatformCommunityBanAtSummaryTransformer.select(),
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
        bannedUser: CommunityPlatformMemberAtSummaryTransformer.select(),
        appliedByModerator:
          CommunityPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_community_ban_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommunityBanSnapshot.ISummary> {
    return {
      id: input.id,
      communityBan:
        await CommunityPlatformCommunityBanAtSummaryTransformer.transform(
          input.communityBan,
        ),
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      bannedUser: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.bannedUser,
      ),
      appliedByModerator:
        await CommunityPlatformMemberAtSummaryTransformer.transform(
          input.appliedByModerator,
        ),
      banStatus: input.ban_status,
      reason: input.reason,
      effectiveFrom: input.effective_from.toISOString(),
      effectiveUntil: input.effective_until?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
