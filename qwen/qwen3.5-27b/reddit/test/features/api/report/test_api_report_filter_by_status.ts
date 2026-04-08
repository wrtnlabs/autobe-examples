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
 * Test moderator report filtering by moderation status (pending, approved, dismissed).
 *
 * Validates that moderators can filter their community's reports by status to efficiently manage the moderation queue. The test creates multiple pending reports and verifies that filtering by status correctly returns only the expected reports for each status type.
 *
 * This test ensures that the report management system correctly categorizes reports by their moderation workflow state, enabling moderators to focus on pending reports while reviewing historical approved or dismissed actions.
 *
 * 1. Register and authenticate a moderator account.
 * 2. Register and authenticate a member account.
 * 3. Create posts that will be reported.
 * 4. Create multiple pending reports on the posts.
 * 5. Filter reports by status='pending' and verify all created reports are returned.
 * 6. Filter reports by status='approved' and verify empty result (no approved reports exist).
 * 7. Filter reports by status='dismissed' and verify empty result (no dismissed reports exist).
 * 8. Filter reports without status and verify all reports are included.
 */
export async function test_api_report_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator setup
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      display_name: RandomGenerator.name(),
    },
  });
  // 2. Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 3. Create posts for reporting
  const post1 = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {},
  );
  typia.assert(post1);
  const post2 = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {},
  );
  typia.assert(post2);
  const post3 = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {},
  );
  typia.assert(post3);
  // 4. Create pending reports
  const report1 = await generate_random_reddit_clone_member_reports_create(
    memberConnection,
    {
      body: {
        report_type: "post",
        post_id: post1.id,
        reason: "Spam content reported",
      },
    },
  );
  typia.assert(report1);
  const report2 = await generate_random_reddit_clone_member_reports_create(
    memberConnection,
    {
      body: {
        report_type: "post",
        post_id: post2.id,
        reason: "Inappropriate content",
      },
    },
  );
  typia.assert(report2);
  const report3 = await generate_random_reddit_clone_member_reports_create(
    memberConnection,
    {
      body: {
        report_type: "post",
        post_id: post3.id,
        reason: "Violates community guidelines",
      },
    },
  );
  typia.assert(report3);
  // 5. Filter by status='pending' - should return all 3 reports
  const pendingFilter = {
    status: "pending" as const,
  } satisfies IRedditCloneReport.IRequest;
  const pendingReports =
    await api.functional.redditClone.moderator.reports.index(
      moderatorConnection,
      { body: pendingFilter },
    );
  typia.assert(pendingReports);
  TestValidator.equals("pending reports count", pendingReports.data.length, 3);
  TestValidator.predicate(
    "all pending reports have pending status",
    pendingReports.data.every((r) => r.status === "pending"),
  );
  // 6. Filter by status='approved' - should return empty (no approved reports)
  const approvedFilter = {
    status: "approved" as const,
  } satisfies IRedditCloneReport.IRequest;
  const approvedReports =
    await api.functional.redditClone.moderator.reports.index(
      moderatorConnection,
      { body: approvedFilter },
    );
  typia.assert(approvedReports);
  TestValidator.equals(
    "approved reports count (none exist)",
    approvedReports.data.length,
    0,
  );
  // 7. Filter by status='dismissed' - should return empty (no dismissed reports)
  const dismissedFilter = {
    status: "dismissed" as const,
  } satisfies IRedditCloneReport.IRequest;
  const dismissedReports =
    await api.functional.redditClone.moderator.reports.index(
      moderatorConnection,
      { body: dismissedFilter },
    );
  typia.assert(dismissedReports);
  TestValidator.equals(
    "dismissed reports count (none exist)",
    dismissedReports.data.length,
    0,
  );
  // 8. Filter without status - should return all 3 reports
  const allFilter = {} satisfies IRedditCloneReport.IRequest;
  const allReports = await api.functional.redditClone.moderator.reports.index(
    moderatorConnection,
    { body: allFilter },
  );
  typia.assert(allReports);
  TestValidator.equals("all reports count", allReports.data.length, 3);
  TestValidator.predicate(
    "all reports have pending status",
    allReports.data.every((r) => r.status === "pending"),
  );
}
