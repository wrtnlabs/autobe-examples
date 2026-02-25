import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
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
import { CommunityPlatformCommunityBanAtSummaryTransformer } from "./CommunityPlatformCommunityBanAtSummaryTransformer";
import { CommunityPlatformModeratorAtSummaryTransformer } from "./CommunityPlatformModeratorAtSummaryTransformer";
import { CommunityPlatformPostAtSummaryTransformer } from "./CommunityPlatformPostAtSummaryTransformer";
import { CommunityPlatformUserAtSummaryTransformer } from "./CommunityPlatformUserAtSummaryTransformer";

export namespace CommunityPlatformModerationAuditLogTransformer {
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
        communityBan:
          CommunityPlatformCommunityBanAtSummaryTransformer.select(),
        resultingActionLogs: true,
      },
    } satisfies Prisma.community_platform_moderation_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformModerationAuditLog> {
    return {
      id: input.id,
      action_type: input.action_type,
      action_details: input.action_details,
      ip_address: input.ip_address,
      user_agent: input.user_agent ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
      moderator: await CommunityPlatformModeratorAtSummaryTransformer.transform(
        input.moderator,
      ),
      targetUser: input.targetUser
        ? await CommunityPlatformUserAtSummaryTransformer.transform(
            input.targetUser,
          )
        : null,
      targetCommunity: input.targetCommunity
        ? await CommunityPlatformCommunityAtSummaryTransformer.transform(
            input.targetCommunity,
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
      communityBan: input.communityBan
        ? await CommunityPlatformCommunityBanAtSummaryTransformer.transform(
            input.communityBan,
          )
        : null,
    };
  }
}
