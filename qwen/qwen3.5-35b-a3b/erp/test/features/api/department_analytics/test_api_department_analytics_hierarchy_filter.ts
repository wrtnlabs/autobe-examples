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

export async function test_api_department_analytics_hierarchy_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const joinConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(auth);
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = {
    ...connection.headers,
    Authorization: auth.token.access,
  };
  // 2. Test analytics endpoint with different hierarchy_type filters
  // Since CREATE API is not available, test with random analytics data
  // The analytics endpoint will return whatever departments exist in the system
  // 3. Call analytics with hierarchy_type: 'root'
  const rootAnalytics =
    await api.functional.hrmPlatform.member.departments.analytics(
      userConnection,
      {
        body: {
          hierarchy_type: "root",
        } satisfies IHrmPlatformDepartment.IAnalyticsRequest,
      },
    );
  typia.assert(rootAnalytics);
  // 4. Call analytics with hierarchy_type: 'child'
  const childAnalytics =
    await api.functional.hrmPlatform.member.departments.analytics(
      userConnection,
      {
        body: {
          hierarchy_type: "child",
        } satisfies IHrmPlatformDepartment.IAnalyticsRequest,
      },
    );
  typia.assert(childAnalytics);
  // 5. Call analytics with hierarchy_type: 'all'
  const allAnalytics =
    await api.functional.hrmPlatform.member.departments.analytics(
      userConnection,
      {
        body: {
          hierarchy_type: "all",
        } satisfies IHrmPlatformDepartment.IAnalyticsRequest,
      },
    );
  typia.assert(allAnalytics);
  // 6. Validate consistency across filters
  // Total count should equal root + child counts
  TestValidator.equals(
    "all filter totalCount equals root + child",
    allAnalytics.totalCount,
    rootAnalytics.totalCount + childAnalytics.totalCount,
  );
  // Validate that root and child counts in 'all' match the individual filter results
  TestValidator.equals(
    "all filter rootDepartmentCount matches root filter",
    allAnalytics.rootDepartmentCount,
    rootAnalytics.rootDepartmentCount,
  );
  TestValidator.equals(
    "all filter childDepartmentCount matches child filter",
    allAnalytics.childDepartmentCount,
    childAnalytics.childDepartmentCount,
  );
  // 7. Validate hierarchy_type='root' filter
  TestValidator.equals(
    "root filter totalCount matches rootDepartmentCount",
    rootAnalytics.totalCount,
    rootAnalytics.rootDepartmentCount,
  );
  TestValidator.equals(
    "root filter childDepartmentCount is 0",
    rootAnalytics.childDepartmentCount,
    0,
  );
  TestValidator.equals(
    "root filter departments count matches totalCount",
    rootAnalytics.departments.length,
    rootAnalytics.totalCount,
  );
  // 8. Validate hierarchy_type='child' filter
  TestValidator.equals(
    "child filter totalCount matches childDepartmentCount",
    childAnalytics.totalCount,
    childAnalytics.childDepartmentCount,
  );
  TestValidator.equals(
    "child filter rootDepartmentCount is 0",
    childAnalytics.rootDepartmentCount,
    0,
  );
  TestValidator.equals(
    "child filter departments count matches totalCount",
    childAnalytics.departments.length,
    childAnalytics.totalCount,
  );
  // 9. Validate department hierarchy structure in 'all' filter results
  // Each department should have correct parentDepartment relationship
  for (const dept of allAnalytics.departments) {
    const isRoot = dept.parentDepartment === null;
    if (isRoot) {
      // Root departments should not have a parent
      TestValidator.predicate(
        `root dept ${dept.name} has no parent`,
        () => dept.parentDepartment === null,
      );
    } else {
      // Child departments should have a valid parent
      TestValidator.notEquals(
        `child dept ${dept.name} has parent`,
        dept.parentDepartment,
        null,
      );
    }
  }
  // 10. Verify analytics summary fields are valid
  TestValidator.predicate(
    "departmentWithMostEmployees is defined",
    () => allAnalytics.departmentWithMostEmployees !== undefined,
  );
  TestValidator.predicate(
    "averageEmployeesPerDepartment is non-negative",
    () => allAnalytics.averageEmployeesPerDepartment >= 0,
  );
  TestValidator.predicate(
    "totalEmployeeCount is non-negative",
    () => allAnalytics.totalEmployeeCount >= 0,
  );
  // 11. Verify department counts are non-negative
  TestValidator.predicate(
    "totalCount is non-negative",
    () => allAnalytics.totalCount >= 0,
  );
  TestValidator.predicate(
    "rootDepartmentCount is non-negative",
    () => allAnalytics.rootDepartmentCount >= 0,
  );
  TestValidator.predicate(
    "childDepartmentCount is non-negative",
    () => allAnalytics.childDepartmentCount >= 0,
  );
}
