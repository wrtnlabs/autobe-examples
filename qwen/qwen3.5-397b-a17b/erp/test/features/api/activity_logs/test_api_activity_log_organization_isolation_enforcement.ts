import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformActivityLog";
import type { IPageIHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

/**
 * Test organization data isolation for activity logs to ensure members can only access logs from their own organization.
 * This is a critical security test validating that organization context scoping is properly enforced.
 *
 * Test Strategy:
 * 1. Create two separate member accounts (Member A and Member B)
 * 2. Create Organization A for Member A and Organization B for Member B
 * 3. Generate activity by performing actions in both organizations
 * 4. Retrieve activity logs as Member A and verify only Organization A logs are returned
 * 5. Retrieve activity logs as Member B and verify only Organization B logs are returned
 * 6. Verify no log ID overlap between organizations (isolation enforcement)
 */
export async function test_api_activity_log_organization_isolation_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A and Organization A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      href: "",
      referrer: "",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAAuth);
  const orgA = await generate_random_hrm_platform_member_organizations_create(
    memberAConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        currency: "USD",
        timezone: "America/New_York",
        fiscal_start_month: 1,
      } satisfies IHrmPlatformOrganization.ICreate,
    },
  );
  typia.assert(orgA);
  // 2. Create Member B and Organization B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      href: "",
      referrer: "",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberBAuth);
  const orgB = await generate_random_hrm_platform_member_organizations_create(
    memberBConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        currency: "EUR",
        timezone: "Europe/London",
        fiscal_start_month: 4,
      } satisfies IHrmPlatformOrganization.ICreate,
    },
  );
  typia.assert(orgB);
  // 3. Generate activity in Organization A by accessing employees endpoint
  const employeesA = await api.functional.hrmPlatform.member.employees.index(
    memberAConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformEmployee.IRequest,
    },
  );
  typia.assert(employeesA);
  // 4. Generate activity in Organization B by accessing employees endpoint
  const employeesB = await api.functional.hrmPlatform.member.employees.index(
    memberBConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformEmployee.IRequest,
    },
  );
  typia.assert(employeesB);
  // 5. Retrieve activity logs as Member A
  const activityLogsA =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberAConnection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IHrmPlatformActivityLog.IRequest,
      },
    );
  typia.assert(activityLogsA);
  // 6. Retrieve activity logs as Member B
  const activityLogsB =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberBConnection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IHrmPlatformActivityLog.IRequest,
      },
    );
  typia.assert(activityLogsB);
  // 7. CRITICAL: Verify organization isolation - no log ID overlap between organizations
  const memberALogIds = new Set(activityLogsA.data.map((log) => log.id));
  const memberBLogIds = new Set(activityLogsB.data.map((log) => log.id));
  // Verify no overlap in log IDs between organizations
  for (const logId of memberBLogIds) {
    TestValidator.predicate(
      `Member A should not see Organization B log ${logId.substring(0, 8)}...`,
      () => !memberALogIds.has(logId),
    );
  }
  // 8. Verify member information in logs is properly populated
  if (activityLogsA.data.length > 0) {
    const firstLogA = activityLogsA.data[0];
    TestValidator.predicate(
      "Organization A log member has display name",
      firstLogA.member.display_name.length > 0,
    );
  }
  if (activityLogsB.data.length > 0) {
    const firstLogB = activityLogsB.data[0];
    TestValidator.predicate(
      "Organization B log member has display name",
      firstLogB.member.display_name.length > 0,
    );
  }
  // 9. Verify different organizations were created
  TestValidator.notEquals(
    "Organization A and B have different IDs",
    orgA.id,
    orgB.id,
  );
  TestValidator.notEquals(
    "Organization A and B have different currencies",
    orgA.currency,
    orgB.currency,
  );
  TestValidator.notEquals(
    "Organization A and B have different timezones",
    orgA.timezone,
    orgB.timezone,
  );
  // 10. Verify different members were created
  TestValidator.notEquals(
    "Member A and B have different IDs",
    memberAAuth.id,
    memberBAuth.id,
  );
  TestValidator.notEquals(
    "Member A and B have different emails",
    memberAAuth.email,
    memberBAuth.email,
  );
}