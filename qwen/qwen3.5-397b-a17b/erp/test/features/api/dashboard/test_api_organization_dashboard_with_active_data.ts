import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationDashboard";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test organization dashboard endpoint with active organizational data.
 *
 * Validates the GET /hrmPlatform/member/dashboard/organization endpoint returns properly structured dashboard metrics including active employee count, weekly hours logged, pending timesheets, projects over budget threshold, and top performing employees.
 *
 * The test authenticates a member account and retrieves the organization dashboard. Since the available APIs only provide member authentication and dashboard retrieval endpoints, this test focuses on validating the response structure and type correctness rather than specific business logic values which depend on pre-existing organizational data.
 *
 * 1. Member authentication via join endpoint establishes valid session with unique credentials.
 * 2. Dashboard endpoint is called with authenticated connection.
 * 3. Response structure is validated using typia.assert() for complete type checking.
 * 4. Business logic validations ensure projects over budget meet the 80% threshold.
 * 5. Top employees array is validated for maximum 5 entries and proper ordering.
 */
export async function test_api_organization_dashboard_with_active_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Retrieve organization dashboard
  const dashboard =
    await api.functional.hrmPlatform.member.dashboard.organization.at(
      memberConnection,
    );
  typia.assert(dashboard);
  // 3. Validate business logic constraints
  TestValidator.predicate(
    "activeEmployeesCount is non-negative",
    dashboard.activeEmployeesCount >= 0,
  );
  TestValidator.predicate(
    "totalHoursThisWeek is non-negative",
    dashboard.totalHoursThisWeek >= 0,
  );
  TestValidator.predicate(
    "pendingTimesheetsCount is non-negative",
    dashboard.pendingTimesheetsCount >= 0,
  );
  // 4. Validate projects over budget business rules
  TestValidator.predicate(
    "topEmployees has max 5 entries",
    dashboard.topEmployees.length <= 5,
  );
  // 5. Validate projects over budget threshold (business rule: >= 80%)
  for (const project of dashboard.projectsOverBudget) {
    TestValidator.predicate(
      `project ${project.name} is over budget threshold (>=80%)`,
      project.utilizationPercentage >= 80,
    );
  }
  // 6. Validate top employees ordering (descending by totalMinutes)
  if (dashboard.topEmployees.length > 1) {
    for (let i = 1; i < dashboard.topEmployees.length; i++) {
      TestValidator.predicate(
        `employee ${i} has <= minutes than employee ${i - 1}`,
        dashboard.topEmployees[i].totalMinutes <=
          dashboard.topEmployees[i - 1].totalMinutes,
      );
    }
  }
}
