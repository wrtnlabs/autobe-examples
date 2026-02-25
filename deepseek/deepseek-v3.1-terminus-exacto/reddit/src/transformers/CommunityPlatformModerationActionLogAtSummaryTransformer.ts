import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformModerationActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionLog";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommentAtSummaryTransformer } from "./CommunityPlatformCommentAtSummaryTransformer";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformModeratorAtSummaryTransformer } from "./CommunityPlatformModeratorAtSummaryTransformer";
import { CommunityPlatformPostAtSummaryTransformer } from "./CommunityPlatformPostAtSummaryTransformer";
import { CommunityPlatformUserAtSummaryTransformer } from "./CommunityPlatformUserAtSummaryTransformer";

export namespace CommunityPlatformModerationActionLogAtSummaryTransformer {
  export type Payload =
    Prisma.community_platform_moderation_action_logsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        action_description: true,
        action_details: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        moderator: CommunityPlatformModeratorAtSummaryTransformer.select(),
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
        targetUser: CommunityPlatformUserAtSummaryTransformer.select(),
        targetPost: CommunityPlatformPostAtSummaryTransformer.select(),
        targetComment: CommunityPlatformCommentAtSummaryTransformer.select(),
        report: {
          select: { id: true },
        } satisfies Prisma.community_platform_moderation_audit_logsFindManyArgs,
      },
    } satisfies Prisma.community_platform_moderation_action_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformModerationActionLog.ISummary> {
    return {
      id: input.id,
      action_type: input.action_type,
      action_description: input.action_description,
      moderator: await CommunityPlatformModeratorAtSummaryTransformer.transform(
        input.moderator,
      ),
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      target_user: input.targetUser
        ? await CommunityPlatformUserAtSummaryTransformer.transform(
            input.targetUser,
          )
        : null,
      target_post: input.targetPost
        ? await CommunityPlatformPostAtSummaryTransformer.transform(
            input.targetPost,
          )
        : null,
      target_comment: input.targetComment
        ? await CommunityPlatformCommentAtSummaryTransformer.transform(
            input.targetComment,
          )
        : null,
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
