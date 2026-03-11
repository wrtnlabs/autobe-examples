import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformCommunityAtSummaryTransformer } from "./RedditPlatformCommunityAtSummaryTransformer";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";

export namespace RedditPlatformModerationAuditLogAtSummaryTransformer {
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
        actionTargetPost: true,
        actionTargetComment: true,
        actionTargetUser: true,
      },
    } satisfies Prisma.reddit_platform_moderation_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformModerationAuditLog.ISummary> {
    return {
      id: input.id,
      action_type: input.action_type,
      action_target_type: input.action_target_type,
      action_target_post_id: input.actionTargetPost?.id ?? null,
      action_target_comment_id: input.actionTargetComment?.id ?? null,
      action_target_user_id: input.actionTargetUser?.id ?? null,
      action_reason: input.action_reason ?? undefined,
      created_at: input.created_at.toISOString(),
      moderator: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.moderator,
      ),
      community: await RedditPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
    };
  }
}
