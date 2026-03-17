import { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";
import { CommunityPlatformModerationRoleAtSummaryTransformer } from "./CommunityPlatformModerationRoleAtSummaryTransformer";

export namespace CommunityPlatformBanTransformer {
  export type Payload = Prisma.community_platform_bansGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        banned_at: true,
        expires_at: true,
        unbanned_at: true,
        active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        bannedMember: CommunityPlatformMemberAtSummaryTransformer.select(),
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
        issuingModeratorRole:
          CommunityPlatformModerationRoleAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformBan> {
    return {
      id: input.id,
      reason: input.reason,
      banned_at: input.banned_at.toISOString(),
      expires_at: input.expires_at ? input.expires_at.toISOString() : null,
      unbanned_at: input.unbanned_at ? input.unbanned_at.toISOString() : null,
      active: input.active,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
      bannedMember: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.bannedMember,
      ),
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      issuingModeratorRole:
        await CommunityPlatformModerationRoleAtSummaryTransformer.transform(
          input.issuingModeratorRole,
        ),
    };
  }
}
