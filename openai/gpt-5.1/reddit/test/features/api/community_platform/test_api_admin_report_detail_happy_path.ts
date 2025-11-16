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
 * Happy-path admin detail retrieval for a memberUser-created report.
 *
 * ## Business scenario
 *
 * A member user files a report against some target (post, comment, user, or
 * community) using a standardized report reason category that has been
 * configured by a platform administrator. Moderation staff, acting as platform
 * admins, should be able to fetch the full details of that report by its UUID
 * identifier through the privileged admin detail endpoint.
 *
 * This test validates that end-to-end flow:
 *
 * - Both platformAdmin and memberUser actors can join/login.
 * - Platform admin can create a report reason category.
 * - Member user can create a report that references that category.
 * - Platform admin can then retrieve that report by id with GET
 *   /communityPlatform/platformAdmin/reports/{reportId}.
 * - The returned ICommunityPlatformReport structure is consistent with the
 *   creation response and exposes privileged fields like description and
 *   relational projections for reporter and reason_category.
 *
 * ## Steps
 *
 * 1. Join as a new platform admin using /auth/platformAdmin/join.
 *
 *    - This also authenticates the connection as platformAdmin due to SDK behavior.
 * 2. Create a report reason category via POST
 *    /communityPlatform/platformAdmin/reportReasonCategories.
 * 3. Join as a new member user using /auth/memberUser/join.
 *
 *    - This authenticates the connection as memberUser.
 * 4. As the member user, create a report via POST
 *    /communityPlatform/memberUser/reports with:
 *
 *    - Reporter_type = "member" (or similar member-oriented value),
 *    - Report_reason_category_id = id from step 2,
 *    - Optional community_id left null (we have no community creation API here),
 *    - Severity set to a concrete value (e.g., "high"),
 *    - Description set to a specific string for later equality checks.
 * 5. Capture the created report’s id and selected fields from the
 *    ICommunityPlatformReport response.
 * 6. Switch authentication back to the platform admin via
 *    /auth/platformAdmin/login so that the privileged report detail endpoint
 *    can be called.
 * 7. Call GET /communityPlatform/platformAdmin/reports/{reportId} using the id
 *    from step 5 via
 *    api.functional.communityPlatform.platformAdmin.reports.at.
 * 8. Assert that the returned object:
 *
 *    - Passes typia.assert<ICommunityPlatformReport>();
 *    - Has the same id as the created report;
 *    - Preserves reporter_type, severity, and description from the create response;
 *    - Has a non-null reason_category whose id matches the category created in step
 *         2;
 *    - Has reporter_memberuser populated (non-null) and reporter_guestuser either
 *         null or undefined, matching expectations for a member reporter;
 *    - Has context_community null/undefined because we did not bind a community_id;
 *    - Does not require any query parameters—only path parameter and authentication.
 */
export async function test_api_admin_report_detail_happy_path(
  connection: api.IConnection,
) {
  // 1. Join as platform admin (also authenticates this connection as platformAdmin).
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create a report reason category as platform admin.
  const reasonCategoryCreateBody = {
    code: `code_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const reasonCategory: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      { body: reasonCategoryCreateBody },
    );
  typia.assert(reasonCategory);

  // 3. Join as a new member user (this switches connection auth to memberUser).
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As member user, create a new report using the created reason category.
  const descriptionText = RandomGenerator.paragraph({ sentences: 6 });
  const severity = "high";
  const reporterType = "member";

  const reportCreateBody = {
    reporter_type: reporterType,
    report_reason_category_id: reasonCategory.id,
    community_id: null,
    severity,
    description: descriptionText,
  } satisfies ICommunityPlatformReport.ICreate;

  const createdReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(createdReport);

  // Sanity checks on the created report before admin fetch.
  TestValidator.equals(
    "created report reporter_type should match input",
    createdReport.reporter_type,
    reporterType,
  );
  TestValidator.equals(
    "created report description should match input",
    createdReport.description ?? null,
    descriptionText,
  );
  TestValidator.equals(
    "created report severity should match input",
    createdReport.severity ?? null,
    severity,
  );
  TestValidator.predicate(
    "created report reason_category must be present",
    createdReport.reason_category !== undefined &&
      createdReport.reason_category !== null,
  );

  const createdReasonCategory = createdReport.reason_category!;
  TestValidator.equals(
    "created report reason_category.id should equal created category id",
    createdReasonCategory.id,
    reasonCategory.id,
  );

  // 5. Switch back to platform admin via login to ensure admin context.
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 6. Admin fetches the report detail by its id.
  const fetchedReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.platformAdmin.reports.at(
      connection,
      {
        reportId: createdReport.id,
      },
    );
  typia.assert(fetchedReport);

  // 7. Validate identity and core fields between created and fetched reports.
  TestValidator.equals(
    "fetched report id should equal created report id",
    fetchedReport.id,
    createdReport.id,
  );
  TestValidator.equals(
    "fetched report reporter_type should equal created reporter_type",
    fetchedReport.reporter_type,
    createdReport.reporter_type,
  );
  TestValidator.equals(
    "fetched report status should equal created status",
    fetchedReport.status,
    createdReport.status,
  );
  TestValidator.equals(
    "fetched report severity should equal created severity",
    fetchedReport.severity ?? null,
    createdReport.severity ?? null,
  );
  TestValidator.equals(
    "fetched report description should equal created description",
    fetchedReport.description ?? null,
    createdReport.description ?? null,
  );

  // 8. Validate timestamps: created_at must be identical, updated_at should be >= created_at.
  TestValidator.equals(
    "fetched report created_at should equal created report created_at",
    fetchedReport.created_at,
    createdReport.created_at,
  );

  TestValidator.predicate(
    "fetched report updated_at should be >= created_at",
    new Date(fetchedReport.updated_at).getTime() >=
      new Date(createdReport.created_at).getTime(),
  );

  // resolved_at may be null; ensure both sides match.
  TestValidator.equals(
    "fetched report resolved_at should equal created report resolved_at",
    fetchedReport.resolved_at ?? null,
    createdReport.resolved_at ?? null,
  );

  // 9. Reporter linkage expectations for member reporter.
  TestValidator.predicate(
    "fetched report reporter_memberuser should be present for member reporter",
    fetchedReport.reporter_memberuser !== undefined &&
      fetchedReport.reporter_memberuser !== null,
  );

  if (
    fetchedReport.reporter_memberuser !== undefined &&
    fetchedReport.reporter_memberuser !== null
  ) {
    const reporterSummary = fetchedReport.reporter_memberuser;
    typia.assert<ICommunityPlatformMemberuser.ISummary>(reporterSummary);
    TestValidator.equals(
      "reporter_memberuser.id should equal member user id",
      reporterSummary.id,
      memberAuthorized.id,
    );
  }

  // Guest reporter should not be populated in this memberUser scenario.
  TestValidator.equals(
    "fetched report reporter_guestuser should be null or undefined for member reporter",
    fetchedReport.reporter_guestuser ?? null,
    null,
  );

  // 10. Reason category linkage: ensure the same category summary is present.
  TestValidator.predicate(
    "fetched report reason_category must be present",
    fetchedReport.reason_category !== undefined &&
      fetchedReport.reason_category !== null,
  );

  if (
    fetchedReport.reason_category !== undefined &&
    fetchedReport.reason_category !== null
  ) {
    const fetchedReasonCategory = fetchedReport.reason_category;
    const createdSummary = createdReasonCategory;

    TestValidator.equals(
      "fetched reason_category.id should equal created category id",
      fetchedReasonCategory.id,
      reasonCategory.id,
    );
    TestValidator.equals(
      "fetched reason_category.code should equal created category code",
      fetchedReasonCategory.code,
      createdSummary.code,
    );
    TestValidator.equals(
      "fetched reason_category.name should equal created category name",
      fetchedReasonCategory.name,
      createdSummary.name,
    );
  }

  // 11. Community context: since we did not set community_id, expect null/undefined.
  TestValidator.equals(
    "fetched report context_community should be null or undefined when community_id was null",
    fetchedReport.context_community ?? null,
    null,
  );

  // 12. No query parameters are required; the fact that this call succeeded
  //     with only path and authentication is implicitly validated by reaching here.
}
