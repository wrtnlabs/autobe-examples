import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test the error scenario when attempting to approve a report that has already been resolved.
 *
 * Validates that the moderation system correctly prevents duplicate approval actions on reports that have already been processed. When a moderator approves a report, the status changes to 'approved' and the reported content is deleted. Attempting to approve the same report again should return a 409 Conflict error, ensuring idempotency and preventing invalid state transitions.
 *
 * This test verifies the system's protection against duplicate moderation actions and confirms that resolved reports cannot be re-approved.
 *
 * 1. Moderator registers and authenticates to gain moderation privileges.
 * 2. Member registers and authenticates to create content and reports.
 * 3. Member creates a post in a community (requires community and subscription setup).
 * 4. Member creates a report on the post with a violation reason.
 * 5. Moderator approves the report (first approval) - status becomes 'approved'.
 * 6. Moderator attempts to approve the same report again.
 * 7. System returns 409 Conflict error as expected.
 */
export async function test_api_report_approve_already_resolved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {});
  // 2. Setup member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 3. Create a post (requires community subscription - using utility function)
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
        reason: "Violates community guidelines - spam content",
      },
    },
  );
  typia.assert(report);
  // 5. First approval - moderator approves the report
  const approvedReport =
    await api.functional.redditClone.moderator.reports.approve(
      moderatorConnection,
      {
        reportId: report.id,
      },
    );
  typia.assert(approvedReport);
  // Validate first approval succeeded
  TestValidator.equals(
    "report status after first approval",
    approvedReport.status,
    "approved",
  );
  // 6. Attempt second approval - should fail with 409 Conflict
  await TestValidator.httpError(
    "cannot approve already resolved report",
    409,
    async () =>
      await api.functional.redditClone.moderator.reports.approve(
        moderatorConnection,
        {
          reportId: report.id,
        },
      ),
  );
}
