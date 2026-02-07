import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformModerationBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformAdminAtSummaryTransformer } from "./CommunityPlatformAdminAtSummaryTransformer";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformMemberTransformer } from "./CommunityPlatformMemberTransformer";

export namespace CommunityPlatformModerationBanAtSummaryTransformer {
  export type Payload = Prisma.community_platform_moderation_bansGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        duration: true,
        started_at: true,
        ends_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
        user: CommunityPlatformMemberTransformer.select(),
        moderator: CommunityPlatformAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_moderation_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformModerationBan.ISummary> {
    return {
      id: input.id,
      reason: input.reason,
      duration: input.duration,
      started_at: toISOStringSafe(input.started_at),
      ends_at: input.ends_at ? toISOStringSafe(input.ends_at) : null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      user: await CommunityPlatformMemberTransformer.transform(input.user),
      moderator: await CommunityPlatformAdminAtSummaryTransformer.transform(
        input.moderator,
      ),
    };
  }
}
