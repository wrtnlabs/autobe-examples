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
 * Validate that a platform administrator can delete a resolved report.
 *
 * Business flow:
 *
 * 1. Register a platform admin (join) – admin token is stored on connection.
 * 2. Register a member user (join) and log in as that member.
 * 3. As the member, create a report via /communityPlatform/memberUser/reports.
 * 4. Log back in as the platform admin.
 * 5. Create a standardized report reason category for resolution classification.
 * 6. Update the report (PUT) to move it into a resolved status and set severity
 *    and reason category.
 * 7. Delete the report (DELETE) as obsolete.
 * 8. Confirm deletion by attempting to update the same report again and asserting
 *    that an error is thrown.
 */
export async function test_api_platform_admin_deletes_report_after_resolution(
  connection: api.IConnection,
) {
  // 1. Register platform admin (implicit login)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Register member user (join)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. Login explicitly as member (actor switch safety)
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: memberJoinBody.ip ?? null,
    href: memberJoinBody.href,
    referrer: memberJoinBody.referrer,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginResult: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginResult);

  // 4. Log in as admin to create a reason category used for resolution
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: adminJoinBody.ip ?? null,
    href: adminJoinBody.href,
    referrer: adminJoinBody.referrer,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLoginResult: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginResult);

  const reasonCategoryBody = {
    code: `spam_${RandomGenerator.alphaNumeric(8)}`,
    name: "Spam / Test Category",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const createdCategory: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      {
        body: reasonCategoryBody,
      },
    );
  typia.assert(createdCategory);

  // 5. Switch back to member to create the report using that category
  const memberLoginResult2: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginResult2);

  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: createdCategory.id,
    community_id: null,
    severity: "low",
    description: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const createdReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(createdReport);

  TestValidator.equals(
    "report should reference the chosen reason category",
    createdReport.reason_category?.id ?? null,
    createdCategory.id,
  );

  const reportId: string = createdReport.id;

  // 6. Switch to platform admin to resolve the report
  const adminLoginResult2: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginResult2);

  const reportUpdateBody = {
    status: "resolved_content_action",
    severity: "high",
    report_reason_category_id: createdCategory.id,
    community_id: createdReport.context_community?.id ?? null,
    description: createdReport.description ?? null,
  } satisfies ICommunityPlatformReport.IUpdate;

  const updatedReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.platformAdmin.reports.update(
      connection,
      {
        reportId,
        body: reportUpdateBody,
      },
    );
  typia.assert(updatedReport);

  TestValidator.equals(
    "report status should be updated to resolved_content_action",
    updatedReport.status,
    reportUpdateBody.status,
  );

  // 7. Delete the resolved report as platform admin
  await api.functional.communityPlatform.platformAdmin.reports.erase(
    connection,
    {
      reportId,
    },
  );

  // 8. Confirm deletion by asserting that further update fails
  await TestValidator.error("updating deleted report should fail", async () => {
    await api.functional.communityPlatform.platformAdmin.reports.update(
      connection,
      {
        reportId,
        body: {
          status: "resolved_no_action",
        } satisfies ICommunityPlatformReport.IUpdate,
      },
    );
  });
}
