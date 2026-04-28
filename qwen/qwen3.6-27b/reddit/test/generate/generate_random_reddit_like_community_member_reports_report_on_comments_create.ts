import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReport";
import type { IREdditLikeCommunityReportOnComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_like_community_report_on_comment } from "../prepare/prepare_random_reddit_like_community_report_on_comment";

/**
 * Generate a random Reddit-like community report on comment junction record for E2E testing.
 *
 * Prepares random report-on-comment data using the prepare function, then calls the creation
 * endpoint to link a report entity to a comment as its target content. This establishes the
 * polymorphic relationship for moderator review, where each report can target exactly one
 * content item (post or comment).
 *
 * The generated junction record includes the report metadata, the reported comment summary,
 * and timestamps. The reportId parameter specifies which existing report to link to the
 * randomly generated comment.
 *
 * @param connection - API connection for authentication and configuration
 * @param props - Optional body customization and required reportId parameter
 * @returns The created junction record linking the report to the targeted comment
 */
export async function generate_random_reddit_like_community_member_reports_report_on_comments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IREdditLikeCommunityReportOnComment.ICreate>;
    params: {
      reportId: string;
    };
  },
): Promise<IREdditLikeCommunityReportOnComment> {
  const prepared: IREdditLikeCommunityReportOnComment.ICreate =
    prepare_random_reddit_like_community_report_on_comment(props.body);
  const result: IREdditLikeCommunityReportOnComment =
    await api.functional.redditLikeCommunity.member.reports.report_on_comments.create(
      connection,
      {
        reportId: props.params.reportId,
        body: prepared,
      },
    );
  return result;
}
