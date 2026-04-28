import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityReport";
import type { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IREdditLikeCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReport";
import type { IREdditLikeCommunityReportOnComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnComment";
import type { IREdditLikeCommunityReportOnPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnPost";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { generate_random_reddit_like_community_member_reports_create } from "../../../generate/generate_random_reddit_like_community_member_reports_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_report } from "../../../prepare/prepare_random_reddit_like_community_report";

/**
 * Test report filtering by status transitions for moderator review.
 *
 * Validates the complete report status transition workflow including member authentication, community establishment, content creation, report submission, and status-based filtering. Ensures that reports correctly transition through pending, approved, and dismissed states.
 *
 * Special attention is given to verifying that the status filter parameter on the reports index endpoint correctly isolates reports by their current review state. Reports in one status (approved/dismissed) must be excluded when filtering for a different status (pending).
 *
 * 1. Member authenticates and creates a community (becomes owner/moderator).
 * 2. First post is created and reported.
 * 3. First report is approved by the moderator, transitioning to approved status.
 * 4. Second post is created and reported.
 * 5. Second report is dismissed by the moderator, transitioning to dismissed status.
 * 6. Reports are fetched with status filter 'pending' - should be empty since both reports are resolved.
 * 7. Reports are fetched with status filter 'approved' - should contain only the first report.
 * 8. Reports are fetched with status filter 'dismissed' - should contain only the second report.
 */
export async function test_api_report_filter_by_status_transitions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member and create community
  const memberConnection: api.IConnection = { host: connection.host };
  const authorization = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    },
  });
  typia.assert(authorization);
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(community);
  // 2. Create first post and report it
  const post1 = await generate_random_reddit_like_community_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  typia.assert(post1);
  const report1 =
    await generate_random_reddit_like_community_member_reports_create(
      memberConnection,
      {
        body: {
          postId: post1.id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(report1);
  // 3. Approve the first report
  const approvedReport =
    await api.functional.redditLikeCommunity.member.reports.approve(
      memberConnection,
      { reportId: report1.id },
    );
  typia.assert(approvedReport);
  TestValidator.equals(
    "approved report status",
    approvedReport.status,
    "approved",
  );
  // 4. Create second post and report it
  const post2 = await generate_random_reddit_like_community_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  typia.assert(post2);
  const report2 =
    await generate_random_reddit_like_community_member_reports_create(
      memberConnection,
      {
        body: {
          postId: post2.id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(report2);
  // 5. Dismiss the second report
  const dismissedReport =
    await api.functional.redditLikeCommunity.member.reports.dismiss.postByReportid(
      memberConnection,
      { reportId: report2.id },
    );
  typia.assert(dismissedReport);
  TestValidator.equals(
    "dismissed report status",
    dismissedReport.status,
    "dismissed",
  );
  // 6. Filter reports by status 'pending' - should be empty
  const pendingResponse =
    await api.functional.redditLikeCommunity.reports.index(memberConnection, {
      body: { status: "pending" } satisfies IREdditLikeCommunityReport.IRequest,
    });
  typia.assert(pendingResponse);
  TestValidator.equals("no pending reports", pendingResponse.data.length, 0);
  // 7. Filter reports by status 'approved' - should contain only first report
  const approvedResponse =
    await api.functional.redditLikeCommunity.reports.index(memberConnection, {
      body: {
        status: "approved",
      } satisfies IREdditLikeCommunityReport.IRequest,
    });
  typia.assert(approvedResponse);
  TestValidator.equals("one approved report", approvedResponse.data.length, 1);
  TestValidator.equals(
    "approved report matches first report",
    approvedResponse.data[0].id,
    approvedReport.id,
  );
  // 8. Filter reports by status 'dismissed' - should contain only second report
  const dismissedResponse =
    await api.functional.redditLikeCommunity.reports.index(memberConnection, {
      body: {
        status: "dismissed",
      } satisfies IREdditLikeCommunityReport.IRequest,
    });
  typia.assert(dismissedResponse);
  TestValidator.equals(
    "one dismissed report",
    dismissedResponse.data.length,
    1,
  );
  TestValidator.equals(
    "dismissed report matches second report",
    dismissedResponse.data[0].id,
    dismissedReport.id,
  );
}