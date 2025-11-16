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
 * Validate that an authenticated member user can create an appeal for an
 * existing moderation report they have just filed.
 *
 * Business flow covered by this E2E test:
 *
 * 1. Register a brand-new member user via POST /auth/memberUser/join.
 *
 *    - This returns ICommunityPlatformMemberuser.IAuthorized and implicitly
 *         configures the connection with a bearer token for the member user.
 * 2. Using the authenticated connection, create a new report through POST
 *    /communityPlatform/memberUser/reports with reporter_type="member".
 * 3. Immediately submit an appeal for that report via POST
 *    /communityPlatform/memberUser/reports/{reportId}/appeals using a valid
 *    ICommunityPlatformAppeal.ICreate payload.
 * 4. Verify that the appeal response is a full ICommunityPlatformAppeal:
 *
 *    - Has a non-empty id.
 *    - Contains a report summary whose id matches the created report id.
 *    - Contains well-formed created_at/updated_at timestamps.
 *    - Has appeal_scope matching the request payload.
 *    - Has a non-empty appeal_status string representing an initial state.
 *
 * Note: The scenario description mentions re-fetching the appeal via a GET
 * endpoint, but such an endpoint is not provided in the current SDK surface for
 * this test, so verification is performed solely on the create response.
 */
export async function test_api_appeal_creation_for_existing_report_by_member_user(
  connection: api.IConnection,
) {
  // 1. Member user registration (join)
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // Basic sanity checks on authorization envelope
  TestValidator.predicate(
    "member user authorized id should be a non-empty UUID string",
    typeof authorized.id === "string" && authorized.id.length > 0,
  );
  TestValidator.predicate(
    "member user authorized email should match email format",
    typeof authorized.email === "string" && authorized.email.length > 0,
  );

  // 2. Create a new moderation report as this member user
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: null,
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  TestValidator.predicate(
    "created report should have a non-empty UUID id",
    typeof report.id === "string" && report.id.length > 0,
  );
  TestValidator.equals(
    "created report reporter_type should echo input reporter_type",
    report.reporter_type,
    reportCreateBody.reporter_type,
  );

  // 3. Create an appeal for the newly created report
  const appealCreateBody = {
    appeal_scope: "content",
    reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
    details: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const appeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.reports.appeals.create(
      connection,
      {
        reportId: report.id,
        body: appealCreateBody,
      },
    );
  typia.assert(appeal);

  // 4. Business validations on the created appeal
  TestValidator.predicate(
    "appeal should have a non-empty UUID id",
    typeof appeal.id === "string" && appeal.id.length > 0,
  );

  TestValidator.equals(
    "appeal report summary id should match original report id",
    appeal.report.id,
    report.id,
  );

  TestValidator.equals(
    "appeal_scope in response should equal request appeal_scope",
    appeal.appeal_scope,
    appealCreateBody.appeal_scope,
  );

  TestValidator.predicate(
    "appeal_status should be a non-empty string representing initial status",
    typeof appeal.appeal_status === "string" && appeal.appeal_status.length > 0,
  );

  TestValidator.predicate(
    "created_at should look like a date-time string",
    typeof appeal.created_at === "string" && appeal.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at should look like a date-time string",
    typeof appeal.updated_at === "string" && appeal.updated_at.length > 0,
  );

  // Ensure basic temporal ordering: updated_at is not before created_at
  const createdAtMs = Date.parse(appeal.created_at);
  const updatedAtMs = Date.parse(appeal.updated_at);

  TestValidator.predicate(
    "updated_at should be greater than or equal to created_at",
    !Number.isNaN(createdAtMs) &&
      !Number.isNaN(updatedAtMs) &&
      updatedAtMs >= createdAtMs,
  );
}
