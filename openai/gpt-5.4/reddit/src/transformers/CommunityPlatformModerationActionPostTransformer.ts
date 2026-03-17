import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import { ICommunityPlatformModerationActionPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionPost";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformCommunityModeratorAtSummaryTransformer } from "./CommunityPlatformCommunityModeratorAtSummaryTransformer";
import { CommunityPlatformPostAtSummaryTransformer } from "./CommunityPlatformPostAtSummaryTransformer";

export namespace CommunityPlatformModerationActionPostTransformer {
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformModerationActionPost> {
    return {
      id: input.id,
      moderationAction: {
        id: input.moderationAction.id,
        communityModerator:
          await CommunityPlatformCommunityModeratorAtSummaryTransformer.transform(
            input.moderationAction.communityModerator,
          ),
        community:
          await CommunityPlatformCommunityAtSummaryTransformer.transform(
            input.moderationAction.community,
          ),
        action_type: input.moderationAction.action_type,
        targetType: "post",
        targetId: input.post.id,
        note: input.moderationAction.note,
        created_at: input.moderationAction.created_at.toISOString(),
        updated_at: input.moderationAction.updated_at.toISOString(),
        deleted_at: input.moderationAction.deleted_at?.toISOString() ?? null,
      } satisfies ICommunityPlatformModerationAction.ISummary,
      post: await CommunityPlatformPostAtSummaryTransformer.transform(
        input.post,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        moderationAction: {
          select: {
            id: true,
            communityModerator:
              CommunityPlatformCommunityModeratorAtSummaryTransformer.select(),
            community: CommunityPlatformCommunityAtSummaryTransformer.select(),
            action_type: true,
            note: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        } satisfies Prisma.community_platform_moderation_actionsFindManyArgs,
        post: CommunityPlatformPostAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_moderation_action_postsFindManyArgs;
  }
  export type Payload =
    Prisma.community_platform_moderation_action_postsGetPayload<
      ReturnType<typeof select>
    >;
}
