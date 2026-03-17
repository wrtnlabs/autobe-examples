import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunitySystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemLog";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";

export namespace RedditCommunitySystemLogAtSummaryTransformer {
  export type Payload = Prisma.reddit_community_system_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        activity_type: true,
        action_performed: true,
        target_type: true,
        metadata: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        actor: RedditCommunityMemberAtSummaryTransformer.select(),
        targetPost: true,
        targetComment: true,
        targetCommunity: true,
        targetReport: true,
      },
    } satisfies Prisma.reddit_community_system_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunitySystemLog.ISummary> {
    return {
      id: input.id,
      activityType: input.activity_type,
      actionPerformed: input.action_performed,
      actor: input.actor
        ? await RedditCommunityMemberAtSummaryTransformer.transform(input.actor)
        : null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
