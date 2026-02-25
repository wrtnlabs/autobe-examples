import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
import { CommunityPlatformModeratorAtSummaryTransformer } from "./CommunityPlatformModeratorAtSummaryTransformer";
import { CommunityPlatformPostAtSummaryTransformer } from "./CommunityPlatformPostAtSummaryTransformer";
import { CommunityPlatformUserAtSummaryTransformer } from "./CommunityPlatformUserAtSummaryTransformer";

export namespace CommunityPlatformModerationAuditLogAtSummaryTransformer {
  export type Payload =
    Prisma.community_platform_moderation_audit_logsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        action_details: true,
        ip_address: true,
        user_agent: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        moderator: CommunityPlatformModeratorAtSummaryTransformer.select(),
        targetUser: CommunityPlatformUserAtSummaryTransformer.select(),
        targetCommunity:
          CommunityPlatformCommunityAtSummaryTransformer.select(),
        targetPost: CommunityPlatformPostAtSummaryTransformer.select(),
        targetComment: CommunityPlatformCommentAtSummaryTransformer.select(),
        communityBan: {
          select: { id: true },
        } satisfies Prisma.community_platform_community_bansFindManyArgs,
        resultingActionLogs: {
          select: { id: true },
        } satisfies Prisma.community_platform_moderation_action_logsFindManyArgs,
      },
    } satisfies Prisma.community_platform_moderation_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformModerationAuditLog.ISummary> {
    return {
      id: input.id,
      action_type: input.action_type,
      action_details: input.action_details,
      moderator: await CommunityPlatformModeratorAtSummaryTransformer.transform(
        input.moderator,
      ),
      targetUser: input.targetUser
        ? await CommunityPlatformUserAtSummaryTransformer.transform(
            input.targetUser,
          )
        : undefined,
      targetCommunity: input.targetCommunity
        ? await CommunityPlatformCommunityAtSummaryTransformer.transform(
            input.targetCommunity,
          )
        : undefined,
      targetPost: input.targetPost
        ? await CommunityPlatformPostAtSummaryTransformer.transform(
            input.targetPost,
          )
        : undefined,
      targetComment: input.targetComment
        ? await CommunityPlatformCommentAtSummaryTransformer.transform(
            input.targetComment,
          )
        : undefined,
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
