import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IPlatformRoleAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPlatformRoleAnalytic";
import type { IRoleAnalyticsEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IRoleAnalyticsEntry";
import type { IRolesAnalyticsRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRolesAnalyticsRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_roles_analytics_comprehensive_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const authConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_member_join(authConnection, {
    body: typia.random<IHrmPlatformMember.IJoin>(),
  });
  typia.assert(authResponse);
  // Create authenticated connection for analytics calls
  const analyticsConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authResponse.token.access },
  };
  // 2. Test analytics without filters (get all roles)
  const allRolesResponse =
    await api.functional.hrmPlatform.member.roles.analytics(
      analyticsConnection,
      {
        body: {},
      },
    );
  typia.assert(allRolesResponse);
  // Validate aggregate statistics
  TestValidator.predicate(
    "built_in_count at least 3 (Owner, Manager, Employee)",
    allRolesResponse.built_in_count >= 3,
  );
  TestValidator.predicate(
    "custom_count is non-negative",
    allRolesResponse.custom_count >= 0,
  );
  TestValidator.equals(
    "total_count equals built_in_count + custom_count",
    allRolesResponse.total_count,
    allRolesResponse.built_in_count + allRolesResponse.custom_count,
  );
  TestValidator.equals(
    "roles_with_employees + roles_without_employees equals total_count",
    allRolesResponse.roles_with_employees +
      allRolesResponse.roles_without_employees,
    allRolesResponse.total_count,
  );
  // Validate each role entry
  const allRoles = allRolesResponse.roles;
  TestValidator.equals("roles is array", Array.isArray(allRoles), true);
  for (const role of allRoles) {
    // Validate UUID format
    TestValidator.predicate(
      "role id is valid UUID",
      /^[0-9a-f-]{36}$/i.test(role.id),
    );
    // Validate role_kind and is_custom consistency
    TestValidator.equals(
      "is_custom matches role_kind",
      role.is_custom,
      role.role_kind === "custom",
    );
    // Validate counts are non-negative
    TestValidator.predicate(
      "permission_count is non-negative",
      role.permission_count >= 0,
    );
    TestValidator.predicate(
      "employee_count is non-negative",
      role.employee_count >= 0,
    );
  }
  // 3. Test pagination
  const paginatedResponse =
    await api.functional.hrmPlatform.member.roles.analytics(
      analyticsConnection,
      {
        body: { page: 1, limit: 2 },
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination returns at most limit items",
    paginatedResponse.roles.length,
    2,
  );
  TestValidator.equals(
    "total_count unchanged with pagination",
    paginatedResponse.total_count,
    allRolesResponse.total_count,
  );
  // Request page 2
  const pageTwoResponse =
    await api.functional.hrmPlatform.member.roles.analytics(
      analyticsConnection,
      {
        body: { page: 2, limit: 2 },
      },
    );
  typia.assert(pageTwoResponse);
  TestValidator.equals(
    "total_count consistent across pages",
    pageTwoResponse.total_count,
    allRolesResponse.total_count,
  );
  // 4. Test filtering by role_kind
  const builtInResponse =
    await api.functional.hrmPlatform.member.roles.analytics(
      analyticsConnection,
      {
        body: { role_kind: "built_in" },
      },
    );
  typia.assert(builtInResponse);
  TestValidator.equals(
    "built_in filter returns only built-in roles",
    builtInResponse.roles.every((r) => r.role_kind === "built_in"),
    true,
  );
  TestValidator.equals(
    "built_in filter count matches built_in_count",
    builtInResponse.built_in_count,
    builtInResponse.total_count,
  );
  const customResponse =
    await api.functional.hrmPlatform.member.roles.analytics(
      analyticsConnection,
      {
        body: { role_kind: "custom" },
      },
    );
  typia.assert(customResponse);
  TestValidator.equals(
    "custom filter returns only custom roles",
    customResponse.roles.every((r) => r.role_kind === "custom"),
    true,
  );
  TestValidator.equals(
    "custom filter count matches custom_count",
    customResponse.custom_count,
    customResponse.total_count,
  );
  // 5. Test filtering by has_employees
  const hasEmployeesResponse =
    await api.functional.hrmPlatform.member.roles.analytics(
      analyticsConnection,
      {
        body: { has_employees: true },
      },
    );
  typia.assert(hasEmployeesResponse);
  TestValidator.equals(
    "has_employees=true returns only roles with employees",
    hasEmployeesResponse.roles.every((r) => r.employee_count > 0),
    true,
  );
  const withoutEmployeesResponse =
    await api.functional.hrmPlatform.member.roles.analytics(
      analyticsConnection,
      {
        body: { has_employees: false },
      },
    );
  typia.assert(withoutEmployeesResponse);
  TestValidator.equals(
    "has_employees=false returns only roles without employees",
    withoutEmployeesResponse.roles.every((r) => r.employee_count === 0),
    true,
  );
  // 6. Test sorting
  // Default sort by name ascending
  const sortedByName = await api.functional.hrmPlatform.member.roles.analytics(
    analyticsConnection,
    {
      body: { sort_by: "name" },
    },
  );
  typia.assert(sortedByName);
  // Verify roles are sorted by name ascending
  for (let i = 1; i < sortedByName.roles.length; i++) {
    TestValidator.predicate(
      `roles sorted by name: ${sortedByName.roles[i - 1].name} <= ${sortedByName.roles[i].name}`,
      sortedByName.roles[i - 1].name <= sortedByName.roles[i].name,
    );
  }
  // Sort by employees descending
  const sortedByEmployees =
    await api.functional.hrmPlatform.member.roles.analytics(
      analyticsConnection,
      {
        body: { sort_by: "employees" },
      },
    );
  typia.assert(sortedByEmployees);
  // Verify roles are sorted by employee_count descending
  for (let i = 1; i < sortedByEmployees.roles.length; i++) {
    TestValidator.predicate(
      `roles sorted by employees desc: ${sortedByEmployees.roles[i - 1].employee_count} >= ${sortedByEmployees.roles[i].employee_count}`,
      sortedByEmployees.roles[i - 1].employee_count >=
        sortedByEmployees.roles[i].employee_count,
    );
  }
}
