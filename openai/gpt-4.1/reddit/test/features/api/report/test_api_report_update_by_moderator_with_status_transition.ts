import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate moderator update behavior for community platform report workflow.
 *
 * This function tests that a moderator, who has just registered, can perform
 * valid updates to a report's status and details, and that business rules for
 * status transitions are enforced. It covers both legitimate and invalid status
 * transitions, and confirms changes in report_type and reason without status
 * changes.
 *
 * 1. Register as a new moderator
 * 2. Simulate a report with schema-compliant mock data (random UUID, summary
 *    objects)
 * 3. Perform the following operations using moderator privileges: a. Valid status
 *    transition from "open" -> "under_review" b. Valid status transition from
 *    "under_review" -> "resolved" c. Attempt invalid transition from "resolved"
 *    -> "open" (should fail) d. Update report_type and reason with status
 *    unchanged
 * 4. Assert that all updates reflect in returned report object and that invalid
 *    transition produces an error.
 */
export async function test_api_report_update_by_moderator_with_status_transition(
  connection: api.IConnection,
) {
  // 1. Register moderator
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
      status: "active",
      href: "https://example.com/moderator-register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // 2. Simulate existence of a report entity (with summary reporter)
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const reporter: ICommunityPlatformUser.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
  };
  // Not saved anywhere, but we use the reportId throughout

  // 3a. Update: status 'open' -> 'under_review'
  const toUnderReview = {
    status: "under_review",
    report_type: "spam",
    reason: "Moderator reviewing report for potential spam.",
  } satisfies ICommunityPlatformReport.IUpdate;
  const underReview =
    await api.functional.communityPlatform.moderator.reports.update(
      connection,
      { reportId, body: toUnderReview },
    );
  typia.assert(underReview);
  TestValidator.equals(
    "status transitioned to under_review",
    underReview.status,
    "under_review",
  );
  TestValidator.equals(
    "report_type remains spam",
    underReview.report_type,
    "spam",
  );
  TestValidator.equals(
    "reason matches under_review",
    underReview.reason,
    "Moderator reviewing report for potential spam.",
  );

  // 3b. Update: status 'under_review' -> 'resolved'
  const toResolved = {
    status: "resolved",
    report_type: "spam",
    reason: "Confirmed spam, moderator resolved the report.",
  } satisfies ICommunityPlatformReport.IUpdate;
  const resolved =
    await api.functional.communityPlatform.moderator.reports.update(
      connection,
      { reportId, body: toResolved },
    );
  typia.assert(resolved);
  TestValidator.equals(
    "status transitioned to resolved",
    resolved.status,
    "resolved",
  );
  TestValidator.equals("report_type still spam", resolved.report_type, "spam");
  TestValidator.equals(
    "reason updated for resolved",
    resolved.reason,
    "Confirmed spam, moderator resolved the report.",
  );

  // 3c. Negative: Try invalid transition 'resolved' -> 'open': should error per moderation workflow
  await TestValidator.error(
    "resolved -> open status transition forbidden",
    async () => {
      const invalid = {
        status: "open",
      } satisfies ICommunityPlatformReport.IUpdate;
      await api.functional.communityPlatform.moderator.reports.update(
        connection,
        { reportId, body: invalid },
      );
    },
  );

  // 3d. Update: change report_type and reason with status unchanged
  const toHarassment = {
    report_type: "harassment",
    reason: "Moderator reclassified as harassment after further review.",
  } satisfies ICommunityPlatformReport.IUpdate;
  const harassmentUpdate =
    await api.functional.communityPlatform.moderator.reports.update(
      connection,
      { reportId, body: toHarassment },
    );
  typia.assert(harassmentUpdate);
  TestValidator.equals(
    "report_type changed to harassment",
    harassmentUpdate.report_type,
    "harassment",
  );
  TestValidator.equals(
    "reason matches harassment review",
    harassmentUpdate.reason,
    "Moderator reclassified as harassment after further review.",
  );
}
