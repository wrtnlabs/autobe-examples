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
 * Platform admin reassigns report reason category while preserving reporter
 * metadata.
 *
 * Business flow:
 *
 * 1. Register a platform admin (join) to obtain an authorized admin context.
 * 2. With admin auth, create two active, user-visible report reason categories (A,
 *    B).
 * 3. Register a member user (join) to act as the reporter.
 * 4. With member auth, create a report bound to category A, keeping initial
 *    snapshot.
 * 5. Switch back to admin auth and update the report, changing
 *    report_reason_category_id from A to B and adjusting severity while leaving
 *    description untouched.
 * 6. Assert that:
 *
 *    - Report.id is unchanged
 *    - Reporter_type is unchanged
 *    - Reporter_memberuser summary is unchanged (same id)
 *    - Created_at is unchanged
 *    - Reason_category summary now points to category B (id/code/name)
 *    - Severity is updated to the new value
 * 7. Negative sub-case: attempt to update the report with a clearly non-existent
 *    report_reason_category_id and assert that the call fails.
 */
export async function test_api_platform_admin_reassigns_report_reason_category(
  connection: api.IConnection,
) {
  // 1. Register platform admin (auto-auth via join)
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    href: "https://admin.console.example.com/join",
    referrer: "https://admin.console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create two active, user-visible reason categories A and B
  const categoryACreate = {
    code: `spam_${RandomGenerator.alphaNumeric(6)}`,
    name: "Spam or advertising",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const categoryA: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      {
        body: categoryACreate,
      },
    );
  typia.assert(categoryA);

  const categoryBCreate = {
    code: `abuse_${RandomGenerator.alphaNumeric(6)}`,
    name: "Harassment or abuse",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const categoryB: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      {
        body: categoryBCreate,
      },
    );
  typia.assert(categoryB);

  // 3. Register member user (join)
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. With member auth, create initial report bound to category A
  const initialSeverity = "low";
  const initialDescription = RandomGenerator.paragraph({ sentences: 8 });

  const createReportBody = {
    reporter_type: "member",
    report_reason_category_id: categoryA.id,
    community_id: null,
    severity: initialSeverity,
    description: initialDescription,
  } satisfies ICommunityPlatformReport.ICreate;

  const createdReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: createReportBody,
      },
    );
  typia.assert(createdReport);

  // Cache original fields we expect to be immutable
  const originalReportId = createdReport.id;
  const originalReporterType = createdReport.reporter_type;
  const originalReporterMemberSummary =
    createdReport.reporter_memberuser ?? null;
  const originalCreatedAt = createdReport.created_at;
  const originalDescription = createdReport.description ?? null;

  TestValidator.predicate(
    "created report reason_category should point to category A",
    createdReport.reason_category !== undefined &&
      createdReport.reason_category.id === categoryA.id,
  );

  // 5. Switch back to admin auth: login explicitly as platform admin (fresh session)
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.console.example.com/login",
    referrer: "https://admin.console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 6. Admin updates report: change reason category from A to B and severity
  const updatedSeverity = "high";
  const updateBody = {
    status: null,
    severity: updatedSeverity,
    report_reason_category_id: categoryB.id,
    community_id: null,
    description: originalDescription,
  } satisfies ICommunityPlatformReport.IUpdate;

  const updatedReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.platformAdmin.reports.update(
      connection,
      {
        reportId: createdReport.id,
        body: updateBody,
      },
    );
  typia.assert(updatedReport);

  // 6-a. Assert invariants
  TestValidator.equals(
    "report id must remain unchanged after update",
    updatedReport.id,
    originalReportId,
  );

  TestValidator.equals(
    "reporter_type must remain unchanged after update",
    updatedReport.reporter_type,
    originalReporterType,
  );

  if (originalReporterMemberSummary !== null) {
    TestValidator.predicate(
      "reporter_memberuser summary must be preserved",
      updatedReport.reporter_memberuser !== undefined &&
        updatedReport.reporter_memberuser !== null &&
        updatedReport.reporter_memberuser.id ===
          originalReporterMemberSummary.id,
    );
  } else {
    TestValidator.equals(
      "reporter_memberuser should remain null when initially null",
      updatedReport.reporter_memberuser ?? null,
      null,
    );
  }

  TestValidator.equals(
    "created_at must remain unchanged after update",
    updatedReport.created_at,
    originalCreatedAt,
  );

  // 6-b. Assert reason_category updated to B
  TestValidator.predicate(
    "reason_category should be updated to category B",
    updatedReport.reason_category !== undefined &&
      updatedReport.reason_category.id === categoryB.id &&
      updatedReport.reason_category.code === categoryB.code &&
      updatedReport.reason_category.name === categoryB.name,
  );

  // 6-c. Assert severity updated
  TestValidator.equals(
    "severity should be updated to new value",
    updatedReport.severity ?? null,
    updatedSeverity,
  );

  // 6-d. Assert description unchanged
  TestValidator.equals(
    "description should remain unchanged after category reassignment",
    updatedReport.description ?? null,
    originalDescription,
  );

  // 7. Negative sub-case: attempt to update with non-existent reason category id
  const nonExistentCategoryId = typia.random<string & tags.Format<"uuid">>();

  const invalidUpdateBody = {
    report_reason_category_id: nonExistentCategoryId,
  } satisfies ICommunityPlatformReport.IUpdate;

  await TestValidator.error(
    "update should fail for non-existent reason category id",
    async () => {
      await api.functional.communityPlatform.platformAdmin.reports.update(
        connection,
        {
          reportId: createdReport.id,
          body: invalidUpdateBody,
        },
      );
    },
  );
}
