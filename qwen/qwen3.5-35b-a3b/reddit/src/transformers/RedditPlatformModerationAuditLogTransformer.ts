import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAuditLog";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformCommentAtSummaryTransformer } from "./RedditPlatformCommentAtSummaryTransformer";
import { RedditPlatformCommunityAtSummaryTransformer } from "./RedditPlatformCommunityAtSummaryTransformer";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";
import { RedditPlatformPostAtSummaryTransformer } from "./RedditPlatformPostAtSummaryTransformer";

export namespace RedditPlatformModerationAuditLogTransformer {
  export type Payload = Prisma.reddit_platform_moderation_audit_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        action_target_type: true,
        action_target_id: true,
        action_reason: true,
        action_details: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        moderator: RedditPlatformMemberAtSummaryTransformer.select(),
        community: RedditPlatformCommunityAtSummaryTransformer.select(),
        actionTargetPost: RedditPlatformPostAtSummaryTransformer.select(),
        actionTargetComment: RedditPlatformCommentAtSummaryTransformer.select(),
        actionTargetUser: RedditPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_platform_moderation_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformModerationAuditLog> {
    return {
      id: input.id,
      moderator: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.moderator,
      ),
      community: await RedditPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      actionType: input.action_type,
      actionTargetPost: input.actionTargetPost
        ? await RedditPlatformPostAtSummaryTransformer.transform(
            input.actionTargetPost,
          )
        : undefined,
      actionTargetComment: input.actionTargetComment
        ? await RedditPlatformCommentAtSummaryTransformer.transform(
            input.actionTargetComment,
          )
        : undefined,
      actionTargetUser: input.actionTargetUser
        ? await RedditPlatformMemberAtSummaryTransformer.transform(
            input.actionTargetUser,
          )
        : undefined,
      actionTargetType: input.action_target_type,
      actionTargetId: input.action_target_id ?? undefined,
      actionReason: input.action_reason ?? undefined,
      actionDetails: input.action_details ?? undefined,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IRedditPlatformModerationAuditLog;
  }
}
