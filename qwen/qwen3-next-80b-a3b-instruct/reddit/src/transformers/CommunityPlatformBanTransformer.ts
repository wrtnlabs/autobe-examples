import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CommunityPlatformModeratorAtSummaryTransformer } from "./CommunityPlatformModeratorAtSummaryTransformer";

export namespace CommunityPlatformBanTransformer {
  export type Payload = Prisma.community_platform_bansGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        created_at: true,
        expired_at: true,
        bannedUser: true,
        community: true,
        moderator: CommunityPlatformModeratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformBan> {
    return {
      id: input.id,
      reason: input.reason,
      created_at: toISOStringSafe(input.created_at),
      banned_user_id: input.bannedUser.id,
      community_id: input.community.id,
      moderator_id: input.moderator.id,
      bannedUser: {
        id: input.bannedUser.id,
      },
      community: {
        name: input.community.name,
        description: input.community.description,
        icon: input.community.icon || "",
        subscriber_count: input.community.subscriber_count,
        created_at: toISOStringSafe(input.community.created_at),
      },
      moderator: await CommunityPlatformModeratorAtSummaryTransformer.transform(
        input.moderator,
      ),
    };
  }
}
