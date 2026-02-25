import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { ICommunityPlatformModerationActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionLog";
import { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
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
import { CommunityPlatformModerationAuditLogTransformer } from "./CommunityPlatformModerationAuditLogTransformer";
import { CommunityPlatformModeratorAtSummaryTransformer } from "./CommunityPlatformModeratorAtSummaryTransformer";
import { CommunityPlatformPostAtSummaryTransformer } from "./CommunityPlatformPostAtSummaryTransformer";
import { CommunityPlatformUserAtSummaryTransformer } from "./CommunityPlatformUserAtSummaryTransformer";

export namespace CommunityPlatformModerationActionLogTransformer {
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
        report: CommunityPlatformModerationAuditLogTransformer.select(),
      },
    } satisfies Prisma.community_platform_moderation_action_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformModerationActionLog> {
    return {
      id: input.id,
      action_type: input.action_type,
      action_description: input.action_description,
      action_details: input.action_details ?? undefined,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      moderator: await CommunityPlatformModeratorAtSummaryTransformer.transform(
        input.moderator,
      ),
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      targetUser: input.targetUser
        ? await CommunityPlatformUserAtSummaryTransformer.transform(
            input.targetUser,
          )
        : null,
      targetPost: input.targetPost
        ? await CommunityPlatformPostAtSummaryTransformer.transform(
            input.targetPost,
          )
        : null,
      targetComment: input.targetComment
        ? await CommunityPlatformCommentAtSummaryTransformer.transform(
            input.targetComment,
          )
        : null,
      report: input.report
        ? await CommunityPlatformModerationAuditLogTransformer.transform(
            input.report,
          )
        : null,
    };
  }
}
