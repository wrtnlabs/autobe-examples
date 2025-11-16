import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

/**
 * Validate that a member user can create a minimal report using only required
 * fields.
 *
 * Business workflow under test:
 *
 * 1. Register a platform administrator via /auth/platformAdmin/join to obtain
 *    platformAdmin context.
 * 2. As platformAdmin, create a report reason category via
 *    /communityPlatform/platformAdmin/reportReasonCategories using
 *    ICommunityPlatformReportReasonCategory.ICreate.
 * 3. Register a member user via /auth/memberUser/join to obtain member context (no
 *    explicit login step is required because join already issues tokens and
 *    sets connection headers).
 * 4. As the authenticated member, call /communityPlatform/memberUser/reports with
 *    only the required fields from ICommunityPlatformReport.ICreate:
 *    reporter_type and report_reason_category_id.
 * 5. Validate that the response is a well-formed ICommunityPlatformReport and that
 *    key business rules hold:
 *
 *    - The report has a non-null UUID id.
 *    - Reporter_type matches the value provided in the request (e.g., "member").
 *    - Status is initialized to some non-empty workflow state string.
 *    - Created_at and updated_at are populated with valid ISO date-time strings.
 *    - Optional fields severity and description are null or undefined when omitted
 *         in the request.
 *    - Reporter_memberuser is populated and its id/username correspond to the
 *         registered member user, while reporter_guestuser is null or
 *         undefined.
 *    - Reason_category is populated and its id matches the created report reason
 *         category id.
 *    - Context_community is null or undefined because no community_id was specified
 *         in the request.
 */
export async function test_api_member_report_creation_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator (platformAdmin.join)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.mobile(), // any string is acceptable; using phone-like for randomness
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create a report reason category as platformAdmin
  const reasonCategoryCode = `reason_${RandomGenerator.alphaNumeric(8)}`;
  const reasonCategoryCreateBody = {
    code: reasonCategoryCode,
    name: "Abusive Content",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const reasonCategory: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      {
        body: reasonCategoryCreateBody,
      },
    );
  typia.assert(reasonCategory);

  // 3. Register a member user (memberUser.join)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As the authenticated member, create a minimal report
  const reporterType = "member";
  const reportCreateBody = {
    reporter_type: reporterType,
    report_reason_category_id: reasonCategory.id,
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  // 5. Business validations on the created report

  // 5.1 Non-null UUID id
  TestValidator.predicate(
    "report id must be a non-empty UUID string",
    typeof report.id === "string" && report.id.length > 0,
  );

  // 5.2 reporter_type echo
  TestValidator.equals(
    "reporter_type must equal the sent value",
    report.reporter_type,
    reporterType,
  );

  // 5.3 status is initialized to a non-empty string
  TestValidator.predicate(
    "status must be a non-empty string",
    typeof report.status === "string" && report.status.length > 0,
  );

  // 5.4 created_at and updated_at must be populated
  TestValidator.predicate(
    "created_at must be a non-empty string",
    typeof report.created_at === "string" && report.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at must be a non-empty string",
    typeof report.updated_at === "string" && report.updated_at.length > 0,
  );

  // 5.5 Optional severity and description should be null/undefined when not provided
  TestValidator.predicate(
    "severity is null or undefined when omitted in request",
    report.severity === null || report.severity === undefined,
  );
  TestValidator.predicate(
    "description is null or undefined when omitted in request",
    report.description === null || report.description === undefined,
  );

  // 5.6 reporter_memberuser is populated, reporter_guestuser is not
  TestValidator.predicate(
    "reporter_memberuser must be populated for member reports",
    report.reporter_memberuser !== null &&
      report.reporter_memberuser !== undefined,
  );
  if (
    report.reporter_memberuser !== null &&
    report.reporter_memberuser !== undefined
  ) {
    TestValidator.equals(
      "reporter_memberuser.id matches memberAuthorized.id",
      report.reporter_memberuser.id,
      memberAuthorized.id,
    );
    TestValidator.equals(
      "reporter_memberuser.username matches memberJoinBody.username",
      report.reporter_memberuser.username,
      memberJoinBody.username,
    );
  }

  TestValidator.predicate(
    "reporter_guestuser is null or undefined for member reports",
    report.reporter_guestuser === null ||
      report.reporter_guestuser === undefined,
  );

  // 5.7 reason_category is present and linked to created category
  TestValidator.predicate(
    "reason_category must be present on the created report",
    report.reason_category !== undefined && report.reason_category !== null,
  );
  if (report.reason_category !== undefined && report.reason_category !== null) {
    TestValidator.equals(
      "reason_category.id must equal the created reason category id",
      report.reason_category.id,
      reasonCategory.id,
    );
  }

  // 5.8 context_community should be null/undefined when community_id is omitted
  TestValidator.predicate(
    "context_community is null or undefined when community_id not provided",
    report.context_community === null || report.context_community === undefined,
  );
}
