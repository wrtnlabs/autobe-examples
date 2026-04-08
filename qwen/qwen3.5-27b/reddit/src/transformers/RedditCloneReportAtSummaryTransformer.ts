import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneCommentAtSummaryTransformer } from "./RedditCloneCommentAtSummaryTransformer";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";
import { RedditClonePostAtSummaryTransformer } from "./RedditClonePostAtSummaryTransformer";

export namespace RedditCloneReportAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_reportsGetPayload<
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
        reportedPost: RedditClonePostAtSummaryTransformer.select(),
        reportedComment: RedditCloneCommentAtSummaryTransformer.select(),
        action: true,
      },
    } satisfies Prisma.reddit_clone_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneReport.ISummary> {
    return {
      id: input.id,
      report_type: input.report_type,
      reason: input.reason,
      status: input.status,
      created_at: input.created_at.toISOString(),
      reporter: await RedditCloneMemberAtSummaryTransformer.transform(
        input.reporter,
      ),
      reportedPost: input.reportedPost
        ? await RedditClonePostAtSummaryTransformer.transform(
            input.reportedPost,
          )
        : null,
      reportedComment: input.reportedComment
        ? await RedditCloneCommentAtSummaryTransformer.transform(
            input.reportedComment,
          )
        : null,
    };
  }
}
