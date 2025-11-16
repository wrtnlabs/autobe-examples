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
 * Validate that a platform administrator can update only the status and
 * severity of an existing moderation report, while leaving its reason category
 * and description unchanged.
 *
 * Business flow covered by this test:
 *
 * 1. Register a platform admin (join) to obtain admin credentials and token.
 * 2. Register a member user (join) that will act as the report submitter.
 * 3. As the member user, create a new moderation report with an initial
 *    reporter_type, reason category id, severity, and description.
 * 4. Switch authentication context back to the platform admin by logging in with
 *    the admin credentials.
 * 5. As the platform admin, update the report using
 *    ICommunityPlatformReport.IUpdate to change only the status and severity,
 *    omitting report_reason_category_id and description so they should remain
 *    unchanged.
 * 6. Assert that the updated report reflects the new status and severity while
 *    preserving the original reason_category, description, created_at, and
 *    reporter metadata, thereby confirming partial update semantics.
 */
export async function test_api_platform_admin_updates_report_status_without_changing_reason_category(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join) and capture credentials
  const adminUsername: string = RandomGenerator.name(1);
  const adminEmail: string = `${RandomGenerator.alphabets(8)}@admin.example.com`;
  const adminPassword: string = "AdminPassword123!";
  const adminHref: string = "https://admin.example.com/join";
  const adminReferrer: string = "https://admin.example.com/";

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: adminUsername,
        email: adminEmail as string & tags.Format<"email">,
        password: adminPassword,
        displayName: RandomGenerator.name(),
        href: adminHref as string & tags.Format<"uri">,
        referrer: adminReferrer as string & tags.Format<"uri">,
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(adminAuthorized);

  // 2. Register member user (join)
  const memberUsername: string = RandomGenerator.name(1);
  const memberEmail: string = `${RandomGenerator.alphabets(8)}@member.example.com`;
  const memberPassword: string = "MemberPassword123!";
  const memberHref: string = "https://app.example.com/join";
  const memberReferrer: string = "https://app.example.com/";

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail as string & tags.Format<"email">,
        password: memberPassword,
        href: memberHref as string & tags.Format<"uri">,
        referrer: memberReferrer as string & tags.Format<"uri">,
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberAuthorized);

  // 3. As member user, create a new report
  const initialSeverity: string = "low";
  const initialDescription: string = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 10,
  });

  const createReportBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    severity: initialSeverity,
    description: initialDescription,
  } satisfies ICommunityPlatformReport.ICreate;

  const originalReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: createReportBody,
      },
    );
  typia.assert(originalReport);

  // Basic sanity checks on created report
  TestValidator.equals(
    "created report description should match initial payload",
    originalReport.description,
    initialDescription,
  );
  TestValidator.equals(
    "created report severity should match initial payload",
    originalReport.severity,
    initialSeverity,
  );
  TestValidator.equals(
    "created report reporter_type should be member",
    originalReport.reporter_type,
    "member",
  );

  // 4. Switch authentication to platform admin by logging in again
  const adminLoginHref: string = "https://admin.example.com/login";
  const adminLoginReferrer: string = "https://admin.example.com/";

  const adminLoginResult: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        identifier: adminUsername,
        password: adminPassword,
        href: adminLoginHref as string & tags.Format<"uri">,
        referrer: adminLoginReferrer as string & tags.Format<"uri">,
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    });
  typia.assert(adminLoginResult);

  // 5. As platform admin, update only status and severity of the report
  const newStatus: string = "under_review";
  const newSeverity: string = "high";

  const updateBody = {
    status: newStatus,
    severity: newSeverity,
  } satisfies ICommunityPlatformReport.IUpdate;

  const updatedReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.platformAdmin.reports.update(
      connection,
      {
        reportId: originalReport.id,
        body: updateBody,
      },
    );
  typia.assert(updatedReport);

  // 6. Validate that status and severity were updated
  TestValidator.equals(
    "report status should be updated to new status",
    updatedReport.status,
    newStatus,
  );
  TestValidator.equals(
    "report severity should be updated to new severity",
    updatedReport.severity,
    newSeverity,
  );

  // 7. Validate that unchanged fields remain the same
  // Reason category should be unchanged
  TestValidator.equals(
    "reason_category should remain unchanged after partial update",
    updatedReport.reason_category,
    originalReport.reason_category,
  );

  // Description should remain unchanged
  TestValidator.equals(
    "description should remain unchanged after partial update",
    updatedReport.description,
    originalReport.description,
  );

  // created_at should remain unchanged
  TestValidator.equals(
    "created_at should remain unchanged after partial update",
    updatedReport.created_at,
    originalReport.created_at,
  );

  // Reporter metadata should remain unchanged
  TestValidator.equals(
    "reporter_type should remain unchanged after partial update",
    updatedReport.reporter_type,
    originalReport.reporter_type,
  );
  TestValidator.equals(
    "reporter_memberuser should remain unchanged after partial update",
    updatedReport.reporter_memberuser,
    originalReport.reporter_memberuser,
  );
  TestValidator.equals(
    "reporter_guestuser should remain unchanged after partial update",
    updatedReport.reporter_guestuser,
    originalReport.reporter_guestuser,
  );
  TestValidator.equals(
    "context_community should remain unchanged after partial update",
    updatedReport.context_community,
    originalReport.context_community,
  );
}
