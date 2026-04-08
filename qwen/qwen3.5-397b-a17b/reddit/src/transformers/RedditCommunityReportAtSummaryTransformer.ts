import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityCommentAtSummaryTransformer } from "./RedditCommunityCommentAtSummaryTransformer";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";
import { RedditCommunityPostAtSummaryTransformer } from "./RedditCommunityPostAtSummaryTransformer";

export namespace RedditCommunityReportAtSummaryTransformer {
  export type Payload = Prisma.reddit_community_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        report_type: true,
        reason: true,
        status: true,
        resolved_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        reporter: RedditCommunityMemberAtSummaryTransformer.select(),
        resolvedBy: RedditCommunityMemberAtSummaryTransformer.select(),
        reportOfPost: {
          select: {
            post: RedditCommunityPostAtSummaryTransformer.select(),
          },
        },
        reportOfComment: {
          select: {
            comment: RedditCommunityCommentAtSummaryTransformer.select(),
          },
        },
      },
    } satisfies Prisma.reddit_community_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityReport.ISummary> {
    return {
      id: input.id,
      reportType: typia.assert<"post" | "comment">(input.report_type),
      status: typia.assert<"pending" | "approved" | "dismissed">(input.status),
      reason: input.reason,
      reporter: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.reporter,
      ),
      target:
        input.report_type === "post"
          ? await RedditCommunityPostAtSummaryTransformer.transform(
              input.reportOfPost!.post,
            )
          : await RedditCommunityCommentAtSummaryTransformer.transform(
              input.reportOfComment!.comment,
            ),
      resolvedAt: input.resolved_at ? toISOStringSafe(input.resolved_at) : null,
      createdAt: toISOStringSafe(input.created_at),
    } satisfies IRedditCommunityReport.ISummary;
  }
}
