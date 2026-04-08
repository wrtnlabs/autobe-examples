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

export namespace RedditCommunityReportTransformer {
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
  ): Promise<IRedditCommunityReport> {
    return {
      id: input.id,
      report_type: input.report_type,
      reason: input.reason,
      status: input.status,
      resolved_at: input.resolved_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      reporter: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.reporter,
      ),
      resolvedBy: input.resolvedBy
        ? await RedditCommunityMemberAtSummaryTransformer.transform(
            input.resolvedBy,
          )
        : null,
      reportedContent:
        input.report_type === "post" && input.reportOfPost
          ? await RedditCommunityPostAtSummaryTransformer.transform(
              input.reportOfPost.post,
            )
          : input.reportOfComment
            ? await RedditCommunityCommentAtSummaryTransformer.transform(
                input.reportOfComment.comment,
              )
            : (undefined as never),
    } satisfies IRedditCommunityReport;
  }
}
