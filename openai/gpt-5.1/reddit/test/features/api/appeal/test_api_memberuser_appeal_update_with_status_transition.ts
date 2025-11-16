import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAppeal";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";

/**
 * Validate that a member user can update their own appeal status and content
 * using the memberUser-scoped appeal update endpoint, while preserving
 * immutable identifiers and temporal ordering.
 *
 * Business flow:
 *
 * 1. Join as a new member user to obtain an authenticated connection.
 * 2. Create a moderation report as this member user.
 * 3. Create an appeal for that report in its initial status.
 * 4. Perform a member-allowed appeal status transition with updated reason_summary
 *    and details using the PUT endpoint.
 * 5. Verify that the updated appeal reflects the new status and text while keeping
 *    id and report linkage intact, and that updated_at is not earlier than
 *    created_at.
 */
export async function test_api_memberuser_appeal_update_with_status_transition(
  connection: api.IConnection,
) {
  // 1. Register a new member user (join) and establish auth context.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a report as this member user.
  const reportBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: null,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportBody },
    );
  typia.assert(report);

  // 3. Create an appeal for that report.
  const appealCreateBody = {
    appeal_scope: "content",
    reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
    details: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const initialAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.reports.appeals.create(
      connection,
      {
        reportId: report.id,
        body: appealCreateBody,
      },
    );
  typia.assert(initialAppeal);

  // 4. Member-allowed status transition with updated summary/details.
  const newStatus = `${initialAppeal.appeal_status}_member_update`;
  const updatedReasonSummary = RandomGenerator.paragraph({ sentences: 4 });
  const updatedDetails = RandomGenerator.content({ paragraphs: 3 });

  const updateBody = {
    appeal_status: newStatus,
    appeal_scope: initialAppeal.appeal_scope,
    reason_summary: updatedReasonSummary,
    details: updatedDetails,
    outcome_summary: null,
    resolved_at: initialAppeal.resolved_at ?? null,
  } satisfies ICommunityPlatformAppeal.IUpdate;

  const updatedAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.reports.appeals.update(
      connection,
      {
        reportId: report.id,
        appealId: initialAppeal.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAppeal);

  // 5. Assertions on successful update.
  TestValidator.equals(
    "appeal id remains stable after update",
    updatedAppeal.id,
    initialAppeal.id,
  );

  TestValidator.equals(
    "report linkage remains intact after update",
    updatedAppeal.report.id,
    initialAppeal.report.id,
  );

  TestValidator.equals(
    "appeal status reflects the requested new value",
    updatedAppeal.appeal_status,
    newStatus,
  );

  TestValidator.equals(
    "appeal scope remains unchanged",
    updatedAppeal.appeal_scope,
    initialAppeal.appeal_scope,
  );

  TestValidator.equals(
    "reason summary is updated",
    updatedAppeal.reason_summary,
    updatedReasonSummary,
  );

  TestValidator.equals(
    "details field is updated",
    updatedAppeal.details,
    updatedDetails,
  );

  const createdAtDate = new Date(initialAppeal.created_at);
  const updatedAtDate = new Date(updatedAppeal.updated_at);

  TestValidator.predicate(
    "updated_at is not earlier than created_at",
    updatedAtDate.getTime() >= createdAtDate.getTime(),
  );

  if (initialAppeal.resolved_at !== undefined) {
    TestValidator.equals(
      "resolved_at remains consistent across non-terminal transition",
      updatedAppeal.resolved_at,
      initialAppeal.resolved_at,
    );
  }
}
