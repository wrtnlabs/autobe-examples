import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_department_analytics_basic_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IHrmPlatformMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePassword123!",
        name: RandomGenerator.name(),
        org_name: RandomGenerator.name(),
        org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmPlatformMember.IJoin,
    },
  );
  typia.assert(member);
  const memberTokenConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: member.token.access },
  };
  // 2. Create departments
  // Since no department creation endpoint exists in available APIs,
  // we cannot create test departments. The test validates the analytics
  // response structure and calculations with the existing data.
  // 3. Call analytics endpoint
  const analytics: IHrmPlatformDepartment.IAnalytic =
    await api.functional.hrmPlatform.member.departments.analytics(
      memberTokenConnection,
      {
        body: {} satisfies IHrmPlatformDepartment.IAnalyticsRequest,
      },
    );
  typia.assert(analytics);
  // 4. Validate response structure and calculations
  // Verify totalCount matches the sum of root and child department counts
  TestValidator.equals(
    "totalCount matches root + child",
    analytics.totalCount,
    analytics.rootDepartmentCount + analytics.childDepartmentCount,
  );
  // Verify departmentWithMostEmployees has valid UUID
  TestValidator.equals(
    "departmentWithMostEmployees.id is valid UUID",
    analytics.departmentWithMostEmployees.id.length === 36,
    true,
  );
  // Verify averageEmployeesPerDepartment is a positive number
  TestValidator.predicate(
    "averageEmployeesPerDepartment is positive",
    analytics.averageEmployeesPerDepartment > 0,
  );
  // Verify totalEmployeeCount is non-negative
  TestValidator.predicate(
    "totalEmployeeCount is non-negative",
    analytics.totalEmployeeCount >= 0,
  );
  // Verify departments array count matches totalCount
  TestValidator.equals(
    "departments array count matches totalCount",
    analytics.departments.length,
    analytics.totalCount,
  );
  // Validate each department has correct hierarchy
  for (const dept of analytics.departments) {
    // Verify department ID format
    TestValidator.equals(
      `department ${dept.id} is valid UUID`,
      dept.id.length === 36,
      true,
    );
    // Verify department has name
    TestValidator.predicate(
      `department ${dept.id} has name`,
      () => dept.name !== "",
    );
    // Verify organization context exists
    TestValidator.predicate(
      `department ${dept.id} has organization`,
      () => dept.organization !== null && dept.organization !== undefined,
    );
    // Verify parentDepartment is either null or has valid ID
    if (dept.parentDepartment !== null) {
      TestValidator.equals(
        `department ${dept.id} parent is valid UUID`,
        dept.parentDepartment.id.length === 36,
        true,
      );
    }
  }
  // Verify the most employees department is in the departments list
  const foundMostEmployees = analytics.departments.some(
    (dept) => dept.id === analytics.departmentWithMostEmployees.id,
  );
  TestValidator.equals(
    "departmentWithMostEmployees is in departments list",
    foundMostEmployees,
    true,
  );
  // Verify organization field in department summaries is not null
  for (const dept of analytics.departments) {
    TestValidator.predicate(
      `department ${dept.id} organization is not null`,
      () => dept.organization !== null,
    );
  }
}
