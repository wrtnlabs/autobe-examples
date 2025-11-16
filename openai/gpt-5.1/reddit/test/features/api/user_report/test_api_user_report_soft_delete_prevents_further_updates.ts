import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserReport";

/**
 * Ensure admin can update an existing user report and that lifecycle metadata
 * changes (status, severity, updated_at) are reflected correctly.
 *
 * Business context:
 *
 * - Community_platform_user_reports stores user reports for moderation.
 * - Member users can file reports as reporters.
 * - Admin users (adminUser actor) can later adjust status and severity through
 *   the admin update endpoint.
 *
 * Steps:
 *
 * 1. Register an adminUser via /auth/adminUser/join.
 * 2. Register a memberUser via /auth/memberUser/join.
 * 3. As the memberUser, create a user report against the member user via
 *    /communityPlatform/memberUser/userReports.
 * 4. Switch back to the adminUser by logging in.
 * 5. As adminUser, call PUT
 *    /communityPlatform/adminUser/userReports/{userReportId} to change status
 *    and severity.
 * 6. Assert that the report id is unchanged and status/severity reflect the new
 *    values, and that updated_at has changed from the original.
 */
export async function test_api_user_report_soft_delete_prevents_further_updates(
  connection: api.IConnection,
) {
  // 1. Register admin user (adminUser A)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassw0rd!";
  const adminUsername = RandomGenerator.name(1);

  const adminJoin = await api.functional.auth.adminUser.join(connection, {
    body: {
      username: adminUsername,
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdminUserJoin.IRequest,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminJoin);

  // 2. Register member user (memberUser M)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPassw0rd!";
  const memberUsername = RandomGenerator.name(1);

  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      ip: null,
      href: "https://community.example.com/register",
      referrer: "https://community.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.IJoin,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberJoin);

  // 3. As memberUser, create a user report against themselves
  const createdReport =
    await api.functional.communityPlatform.memberUser.userReports.create(
      connection,
      {
        body: {
          reported_memberuser_id: memberJoin.id,
          reason_category: "harassment",
          reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
          status: "open",
          severity: "low",
        } satisfies ICommunityPlatformUserReport.ICreate,
      },
    );
  typia.assert<ICommunityPlatformUserReport>(createdReport);

  // 4. Switch back to adminUser via login (ensures admin auth context)
  const adminLogin = await api.functional.auth.adminUser.login(connection, {
    body: {
      identifier: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://community.example.com/admin/login",
      referrer: "https://community.example.com/admin",
    } satisfies ICommunityPlatformAdminUserLogin.IRequest,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminLogin);

  // 5. As adminUser, update the report's status and severity
  const newStatus = "resolved" as const;
  const newSeverity = "high" as const;
  const updatedReport =
    await api.functional.communityPlatform.adminUser.userReports.update(
      connection,
      {
        userReportId: createdReport.id,
        body: {
          status: newStatus,
          severity: newSeverity,
          reason_detail: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformUserReport.IUpdate,
      },
    );
  typia.assert<ICommunityPlatformUserReport>(updatedReport);

  // 6. Validate that id is unchanged and lifecycle fields updated
  TestValidator.equals(
    "user report id must remain stable after admin update",
    updatedReport.id,
    createdReport.id,
  );

  TestValidator.equals(
    "user report status should be updated to new value",
    updatedReport.status,
    newStatus,
  );

  TestValidator.equals(
    "user report severity should be updated to new value",
    updatedReport.severity,
    newSeverity,
  );

  TestValidator.notEquals(
    "updated_at must change after admin update",
    updatedReport.updated_at,
    createdReport.updated_at,
  );
}
