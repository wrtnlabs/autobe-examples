import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import { ICommunityPlatformModerationActionBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityBanTransformer } from "./CommunityPlatformCommunityBanTransformer";
import { CommunityPlatformModerationActionTransformer } from "./CommunityPlatformModerationActionTransformer";

export namespace CommunityPlatformModerationActionBanTransformer {
  export type Payload =
    Prisma.community_platform_moderation_action_bansGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        moderationAction: CommunityPlatformModerationActionTransformer.select(),
        communityBan: CommunityPlatformCommunityBanTransformer.select(),
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.community_platform_moderation_action_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformModerationActionBan> {
    return {
      id: input.id,
      moderationAction:
        await CommunityPlatformModerationActionTransformer.transform(
          input.moderationAction,
        ),
      communityBan: await CommunityPlatformCommunityBanTransformer.transform(
        input.communityBan,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
