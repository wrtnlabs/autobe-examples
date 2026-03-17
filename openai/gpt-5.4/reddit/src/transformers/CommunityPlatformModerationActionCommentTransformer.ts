import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import { ICommunityPlatformModerationActionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformModerationActionTransformer } from "./CommunityPlatformModerationActionTransformer";

export namespace CommunityPlatformModerationActionCommentTransformer {
  export type Payload =
    Prisma.community_platform_moderation_action_commentsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        moderationAction: CommunityPlatformModerationActionTransformer.select(),
        comment: {
          select: {},
        } satisfies Prisma.community_platform_commentsFindManyArgs,
      },
    } satisfies Prisma.community_platform_moderation_action_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformModerationActionComment> {
    return {
      id: input.id,
      moderationAction:
        await CommunityPlatformModerationActionTransformer.transform(
          input.moderationAction,
        ),
      comment: {} satisfies ICommunityPlatformComment,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
