import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { IRedditCommunitySystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemLog";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityCommentAtSummaryTransformer } from "./RedditCommunityCommentAtSummaryTransformer";
import { RedditCommunityCommunityAtSummaryTransformer } from "./RedditCommunityCommunityAtSummaryTransformer";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";
import { RedditCommunityPostAtSummaryTransformer } from "./RedditCommunityPostAtSummaryTransformer";
import { RedditCommunityReportAtSummaryTransformer } from "./RedditCommunityReportAtSummaryTransformer";

export namespace RedditCommunitySystemLogTransformer {
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
        targetPost: RedditCommunityPostAtSummaryTransformer.select(),
        targetComment: RedditCommunityCommentAtSummaryTransformer.select(),
        targetCommunity: RedditCommunityCommunityAtSummaryTransformer.select(),
        targetReport: RedditCommunityReportAtSummaryTransformer.select(),
      },
    };
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunitySystemLog> {
    return {
      id: input.id,
      actor: input.actor
        ? await RedditCommunityMemberAtSummaryTransformer.transform(input.actor)
        : undefined,
      targetPost: input.targetPost
        ? await RedditCommunityPostAtSummaryTransformer.transform(
            input.targetPost,
          )
        : undefined,
      targetComment: input.targetComment
        ? await RedditCommunityCommentAtSummaryTransformer.transform(
            input.targetComment,
          )
        : undefined,
      targetCommunity: input.targetCommunity
        ? await RedditCommunityCommunityAtSummaryTransformer.transform(
            input.targetCommunity,
          )
        : undefined,
      targetReport: input.targetReport
        ? await RedditCommunityReportAtSummaryTransformer.transform(
            input.targetReport,
          )
        : undefined,
      activity_type: input.activity_type,
      action_performed: input.action_performed,
      target_type: input.target_type as
        | "member"
        | "comment"
        | "post"
        | "community"
        | "report"
        | null
        | undefined,
      metadata: input.metadata ?? undefined,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
