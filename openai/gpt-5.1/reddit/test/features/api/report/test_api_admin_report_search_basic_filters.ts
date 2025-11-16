import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";

/**
 * Verify that a platform admin can search and list moderation reports with
 * basic filter and pagination behavior.
 *
 * Business flow:
 *
 * 1. Register a platform admin (join) and rely on the SDK to authenticate that
 *    admin.
 * 2. Under the admin context, create a report reason category that the member
 *    reports will reference.
 * 3. Register a member user (join) and rely on the SDK to authenticate that
 *    member.
 * 4. As the authenticated member user, create multiple reports referencing the
 *    same reason category and community (community_id may be null, which is
 *    acceptable), with varying severities and descriptions so that we have a
 *    small set of deterministic data for the search.
 * 5. Switch back to the platform admin context using platformAdmin.login so that
 *    we can call the admin report search endpoint.
 * 6. Call PATCH /communityPlatform/platformAdmin/reports via
 *    api.functional.communityPlatform.platformAdmin.reports.index with an
 *    ICommunityPlatformReport.IRequest body that:
 *
 *    - Sets page = 1 and pageSize to a moderate value (e.g. 20).
 *    - Filters by community_ids and reason_category_ids that match the test data we
 *         have created.
 * 7. Assert that the response is a valid IPageICommunityPlatformReport.ISummary
 *    using typia.assert, and verify pagination metadata is consistent with the
 *    number of reports we expect to match the filter (the count of created
 *    reports sharing that community/reason combination).
 * 8. Validate that every returned report summary belongs to the selected reason
 *    category and (when non-null) to one of the filtered community_ids, and
 *    that the basic summary fields (id, reporter, targetType, reasonCategory,
 *    status, createdAt) are present and well-formed.
 * 9. Optionally, create an extra report bound to a different reason category so
 *    that we can assert it does not appear when the search is filtered only to
 *    the original reason_category_id.
 */
export async function test_api_admin_report_search_basic_filters(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join) — SDK will set Authorization header.
  const adminJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "AdminPass123!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Under admin context, create a report reason category.
  const reasonCategoryBody = {
    code: `code_${RandomGenerator.alphabets(8)}`,
    name: "Test Reason Category",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const reasonCategory: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      { body: reasonCategoryBody },
    );
  typia.assert(reasonCategory);

  // 3. Register member user (join) — SDK will switch Authorization header.
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(10)}@member.test`,
    password: "MemberPass123!",
    ip: "127.0.0.1",
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As member, create multiple reports sharing same reason category and
  //    potentially a null community_id (allowed by DTO). We keep track of
  //    created reports so we can validate they are included in search.
  const createdReports: ICommunityPlatformReport[] = [];

  const baseCreateReport = async (
    severity: string | null,
    description: string,
  ) => {
    const createBody = {
      reporter_type: "member",
      report_reason_category_id: reasonCategory.id,
      community_id: null,
      severity,
      description,
    } satisfies ICommunityPlatformReport.ICreate;

    const report: ICommunityPlatformReport =
      await api.functional.communityPlatform.memberUser.reports.create(
        connection,
        { body: createBody },
      );
    typia.assert(report);
    createdReports.push(report);
  };

  await baseCreateReport("low", RandomGenerator.paragraph({ sentences: 3 }));
  await baseCreateReport("medium", RandomGenerator.paragraph({ sentences: 4 }));
  await baseCreateReport("high", RandomGenerator.paragraph({ sentences: 5 }));

  // Optionally create a report for a different reason category
  const otherReasonCategoryBody = {
    code: `code_${RandomGenerator.alphabets(8)}`,
    name: "Other Reason Category",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const otherReasonCategory: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      { body: otherReasonCategoryBody },
    );
  typia.assert(otherReasonCategory);

  const otherReportBody = {
    reporter_type: "member",
    report_reason_category_id: otherReasonCategory.id,
    community_id: null,
    severity: "low",
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const otherReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: otherReportBody },
    );
  typia.assert(otherReport);

  // 5. Switch back to admin context using login. We re-use the original
  //    admin credentials; SDK will update Authorization header.
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 6. Call admin reports.index with filters for the first reason category and
  //    null community (community_ids omitted because our test reports have
  //    community_id = null, which cannot be expressed in the filter array).
  const pageSize: number & tags.Type<"int32"> & tags.Minimum<1> = 20 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;

  const requestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize,
    statuses: undefined,
    reporter_types: ["member"],
    severity_levels: undefined,
    community_ids: undefined,
    reason_category_ids: [reasonCategory.id],
    created_from: null,
    created_to: null,
    resolved_from: null,
    resolved_to: null,
    description_query: null,
    sort_by: null,
    sort_direction: null,
  } satisfies ICommunityPlatformReport.IRequest;

  const page: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.platformAdmin.reports.index(
      connection,
      { body: requestBody },
    );
  typia.assert(page);

  // 7. Validate pagination metadata: we expect at least the createdReports
  //    to be potentially visible under this filter, but the backend may have
  //    pre-existing data. We assert that the page limit matches what we
  //    specified and that records/pages are non-negative.
  const pagination = page.pagination;
  TestValidator.equals(
    "pagination.limit should equal requested pageSize",
    pagination.limit,
    pageSize,
  );
  TestValidator.predicate(
    "pagination.records should be >= number of created matching reports",
    pagination.records >= createdReports.length,
  );
  TestValidator.predicate(
    "pagination.current should be >= 0",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.pages should be >= 0",
    pagination.pages >= 0,
  );

  // 8. Validate each data item has required summary fields and matches filters.
  const summaries = page.data;

  // There should be at least as many summaries as we created, unless the
  // system enforces additional constraints. We assert at least 1 to keep the
  // test robust to prior data.
  TestValidator.predicate(
    "at least one report summary returned for the filtered reason category",
    summaries.length >= 1,
  );

  for (const summary of summaries) {
    typia.assert<ICommunityPlatformReport.ISummary>(summary);

    // Ensure reasonCategory matches our filtered reason category.
    TestValidator.equals(
      "summary.reasonCategory.id must equal filtered reason category id",
      summary.reasonCategory.id,
      reasonCategory.id,
    );

    // Ensure reporter and basic fields are present and non-empty.
    TestValidator.predicate(
      "summary.id must be a non-empty string",
      typeof summary.id === "string" && summary.id.length > 0,
    );
    TestValidator.predicate(
      "summary.reporter.displayName must be non-empty",
      typeof summary.reporter.displayName === "string" &&
        summary.reporter.displayName.length > 0,
    );
    TestValidator.predicate(
      "summary.targetType must be non-empty",
      typeof summary.targetType === "string" && summary.targetType.length > 0,
    );
    TestValidator.predicate(
      "summary.status must be non-empty",
      typeof summary.status === "string" && summary.status.length > 0,
    );
  }

  // 9. Confirm that the report created with the other reason category is not
  //    present in the current filtered list.
  const containsOtherReason = summaries.some(
    (s) => s.reasonCategory.id === otherReasonCategory.id,
  );
  TestValidator.predicate(
    "reports with other reason category should not appear under reason_category_ids filter",
    containsOtherReason === false,
  );
}
