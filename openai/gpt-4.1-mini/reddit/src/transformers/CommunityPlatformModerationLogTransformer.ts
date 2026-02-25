import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationLog";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommentAtSummaryTransformer } from "./CommunityPlatformCommentAtSummaryTransformer";
import { CommunityPlatformCommunityModeratorTransformer } from "./CommunityPlatformCommunityModeratorTransformer";
import { CommunityPlatformPostAtSummaryTransformer } from "./CommunityPlatformPostAtSummaryTransformer";

export namespace CommunityPlatformModerationLogTransformer {
  export type Payload = Prisma.community_platform_moderation_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        action_details: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        moderator: CommunityPlatformCommunityModeratorTransformer.select(),
        post: CommunityPlatformPostAtSummaryTransformer.select(),
        comment: CommunityPlatformCommentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_moderation_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformModerationLog> {
    return {
      id: input.id,
      actionType: input.action_type,
      actionDetails: input.action_details ?? null,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      moderator: await CommunityPlatformCommunityModeratorTransformer.transform(
        input.moderator,
      ),
      post: input.post
        ? await CommunityPlatformPostAtSummaryTransformer.transform(input.post)
        : null,
      comment: input.comment
        ? await CommunityPlatformCommentAtSummaryTransformer.transform(
            input.comment,
          )
        : null,
    };
  }
}
