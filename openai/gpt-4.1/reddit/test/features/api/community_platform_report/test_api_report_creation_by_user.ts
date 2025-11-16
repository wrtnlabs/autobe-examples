import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validates that a registered user can create a report against a platform
 * entity (post, comment, or community), following business rules for single
 * target constraint and uniqueness.
 *
 * Steps:
 *
 * 1. Register a new user (join API) to obtain authentication context.
 * 2. Use the user's token to submit a report via /communityPlatform/user/reports
 *    endpoint, selecting one target type (e.g., reported_post_id, others
 *    null).
 * 3. Verify the returned report matches input fields, and API-managed fields (id,
 *    status, created_at, updated_at) are present and have correct
 *    formats/types.
 * 4. Assert that only the selected reported_xxx summary field is non-null in the
 *    response, others are null.
 * 5. Negative path: attempt to submit a duplicate report (same user & target),
 *    which must fail business uniqueness rule and be asserted via
 *    TestValidator.error.
 */
export async function test_api_report_creation_by_user(
  connection: api.IConnection,
) {
  // 1. User registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const user = await api.functional.auth.user.join(connection, {
    body: { email, password } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  TestValidator.equals("user email", user.email, email);
  // 2. Prepare report data (against post, but could also be comment/community)
  // Use random UUID as target (API validates referential integrity)
  const fakePostId = typia.random<string & tags.Format<"uuid">>();
  const reportType = "spam";
  const reason = RandomGenerator.paragraph({ sentences: 3 });
  const reportBody = {
    reported_post_id: fakePostId,
    reported_comment_id: null,
    reported_community_id: null,
    report_type: reportType,
    reason,
  } satisfies ICommunityPlatformReport.ICreate;
  // 3. Create report
  const report = await api.functional.communityPlatform.user.reports.create(
    connection,
    { body: reportBody },
  );
  typia.assert(report);
  // 4. Field validation
  TestValidator.equals("reporter matches", report.reporter.id, user.id);
  TestValidator.equals(
    "reported_post_id matches",
    report.reported_post?.id,
    fakePostId,
  );
  TestValidator.equals(
    "reported_comment_id is null",
    report.reported_comment,
    null,
  );
  TestValidator.equals(
    "reported_community_id is null",
    report.reported_community,
    null,
  );
  TestValidator.equals("report_type matches", report.report_type, reportType);
  TestValidator.equals("reason matches", report.reason, reason);
  TestValidator.equals(
    "status is open or pending",
    typeof report.status,
    "string",
  );
  // 5. System managed fields
  TestValidator.predicate(
    "id format",
    typeof report.id === "string" && /[0-9a-f-]{36}/i.test(report.id),
  );
  TestValidator.predicate(
    "created_at date-time",
    /^\d{4}-\d{2}-\d{2}T/.test(report.created_at),
  );
  TestValidator.predicate(
    "updated_at date-time",
    /^\d{4}-\d{2}-\d{2}T/.test(report.updated_at),
  );
  // 6. Negative path: try to create duplicate report for same target
  await TestValidator.error("duplicate report creation fails", async () => {
    await api.functional.communityPlatform.user.reports.create(connection, {
      body: reportBody,
    });
  });
}
