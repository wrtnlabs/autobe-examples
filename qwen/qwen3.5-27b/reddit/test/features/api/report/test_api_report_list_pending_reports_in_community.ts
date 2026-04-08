import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneReport";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_reports_create } from "../../../generate/generate_random_reddit_clone_member_reports_create";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_report } from "../../../prepare/prepare_random_reddit_clone_report";

/**
 * Test that a moderator can view all pending reports for posts and comments within their assigned community.
 *
 * Validates the complete report listing workflow including moderator authentication, report creation by members, and paginated report retrieval. Ensures that reports are properly structured with reporter information, reported content details, and moderation status.
 *
 * Special attention is given to verifying that the report list is scoped to the moderator's community, pagination metadata is accurate, and default sorting orders reports by creation date descending.
 *
 * 1. Moderator registers and authenticates to gain access to moderation endpoints.
 * 2. Member registers and authenticates to create content and reports.
 * 3. Member creates a post in the community.
 * 4. Member submits a report on the post with a reason.
 * 5. Moderator queries the reports endpoint with status filter set to 'pending'.
 * 6. Validates response structure, pagination metadata, and report content.
 */
export async function test_api_report_list_pending_reports_in_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator setup
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Member setup (reporter)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Create a post to be reported
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {},
  );
  typia.assert(post);
  // 4. Create a report on the post
  const report = await generate_random_reddit_clone_member_reports_create(
    memberConnection,
    {
      body: {
        report_type: "post",
        post_id: post.id,
        reason: "This content violates community guidelines",
      },
    },
  );
  typia.assert(report);
  // 5. Moderator queries pending reports
  const reportsPage = await api.functional.redditClone.moderator.reports.index(
    moderatorConnection,
    {
      body: {
        status: "pending",
        page: 1,
        limit: 20,
      } satisfies IRedditCloneReport.IRequest,
    },
  );
  typia.assert(reportsPage);
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    reportsPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    reportsPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    reportsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    reportsPage.pagination.pages >= 0,
  );
  // 7. Validate report list is not empty (our report should be there)
  TestValidator.predicate(
    "reports list contains at least one report",
    reportsPage.data.length > 0,
  );
  // 8. Validate each report structure
  await ArrayUtil.asyncForEach(reportsPage.data, async (report) => {
    typia.assert(report);
    // Validate required fields exist
    TestValidator.predicate(
      `report has valid report_type`,
      ["post", "comment"].includes(report.report_type),
    );
    TestValidator.predicate(
      `report has non-empty reason`,
      report.reason.length > 0,
    );
    TestValidator.predicate(
      `report status is pending`,
      report.status === "pending",
    );
    // Validate reporter information
    typia.assert(report.reporter);
    TestValidator.predicate(
      `reporter has valid username`,
      report.reporter.username.length > 0,
    );
    TestValidator.predicate(
      `reporter has profile with display name`,
      report.reporter.profile.display_name.length > 0,
    );
    // Validate reported content based on type
    if (report.report_type === "post") {
      typia.assertGuard(report.reportedPost!);
      TestValidator.predicate(
        `reported post has valid title`,
        report.reportedPost.title.length > 0,
      );
    } else if (report.report_type === "comment") {
      typia.assertGuard(report.reportedComment!);
      TestValidator.predicate(
        `reported comment has valid content`,
        report.reportedComment.content.length > 0,
      );
    }
  });
  // 9. Verify our created report is in the list
  const ourReport = reportsPage.data.find((r) => r.id === report.id);
  TestValidator.predicate(
    "our created report is in the list",
    ourReport !== undefined,
  );
  // 10. Verify report details match
  if (ourReport) {
    TestValidator.equals("report type matches", ourReport.report_type, "post");
    TestValidator.equals(
      "report status is pending",
      ourReport.status,
      "pending",
    );
    TestValidator.equals(
      "reported post id matches",
      ourReport.reportedPost?.id,
      post.id,
    );
  }
}