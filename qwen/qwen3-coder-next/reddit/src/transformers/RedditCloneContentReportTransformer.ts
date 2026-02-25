import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentComment";
import { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import { IRedditCloneContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentReport";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { IRedditCloneModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorAssignment";
import { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneContentCommentAtSummaryTransformer } from "./RedditCloneContentCommentAtSummaryTransformer";
import { RedditCloneContentPostAtSummaryTransformer } from "./RedditCloneContentPostAtSummaryTransformer";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";
import { RedditCloneModeratorAssignmentAtSummaryTransformer } from "./RedditCloneModeratorAssignmentAtSummaryTransformer";

export namespace RedditCloneContentReportTransformer {
  export type Payload = Prisma.reddit_clone_content_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        report_type: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        reporter: RedditCloneMemberAtSummaryTransformer.select(),
        post: RedditCloneContentPostAtSummaryTransformer.select(),
        comment: RedditCloneContentCommentAtSummaryTransformer.select(),
        resolvedByModerator:
          RedditCloneModeratorAssignmentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_content_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneContentReport> {
    return {
      id: input.id,
      reporter: await RedditCloneMemberAtSummaryTransformer.transform(
        input.reporter,
      ),
      post: input.post
        ? await RedditCloneContentPostAtSummaryTransformer.transform(input.post)
        : undefined,
      comment: input.comment
        ? await RedditCloneContentCommentAtSummaryTransformer.transform(
            input.comment,
          )
        : undefined,
      resolvedByModerator: input.resolvedByModerator
        ? await RedditCloneModeratorAssignmentAtSummaryTransformer.transform(
            input.resolvedByModerator,
          )
        : undefined,
      reportType: input.report_type as "post" | "comment",
      reason: input.reason,
      status: input.status as "pending" | "approved" | "dismissed",
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at ? input.deleted_at.toISOString() : undefined,
    };
  }
}
