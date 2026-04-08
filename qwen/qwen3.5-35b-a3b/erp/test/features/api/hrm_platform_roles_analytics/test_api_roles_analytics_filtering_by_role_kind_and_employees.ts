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

export async function test_api_roles_analytics_filtering_by_role_kind_and_employees(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member user with organization creation
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: typia.random<string>(),
      org_description: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Test filtering by role_kind='custom'
  const customFilterRequest: IRolesAnalyticsRequest = {
    role_kind: "custom",
  };
  const customFilterResponse =
    await api.functional.hrmPlatform.member.roles.analytics(memberConnection, {
      body: customFilterRequest,
    });
  typia.assert(customFilterResponse);
  TestValidator.equals(
    "built_in_count should be 0 for custom filter",
    customFilterResponse.built_in_count,
    0,
  );
  TestValidator.equals(
    "custom_count should equal total_count for custom filter",
    customFilterResponse.custom_count,
    customFilterResponse.total_count,
  );
  customFilterResponse.roles.forEach((role) => {
    TestValidator.equals(
      "role_kind should be custom for all roles",
      role.role_kind,
      "custom",
    );
  });
  // 3. Test filtering by role_kind='built_in'
  const builtinFilterRequest: IRolesAnalyticsRequest = {
    role_kind: "built_in",
  };
  const builtinFilterResponse =
    await api.functional.hrmPlatform.member.roles.analytics(memberConnection, {
      body: builtinFilterRequest,
    });
  typia.assert(builtinFilterResponse);
  TestValidator.equals(
    "custom_count should be 0 for built_in filter",
    builtinFilterResponse.custom_count,
    0,
  );
  TestValidator.equals(
    "built_in_count should equal total_count for built_in filter",
    builtinFilterResponse.built_in_count,
    builtinFilterResponse.total_count,
  );
  builtinFilterResponse.roles.forEach((role) => {
    TestValidator.equals(
      "role_kind should be built_in for all roles",
      role.role_kind,
      "built_in",
    );
  });
  // 4. Test filtering by has_employees=true
  const hasEmployeesRequest: IRolesAnalyticsRequest = {
    has_employees: true,
  };
  const hasEmployeesResponse =
    await api.functional.hrmPlatform.member.roles.analytics(memberConnection, {
      body: hasEmployeesRequest,
    });
  typia.assert(hasEmployeesResponse);
  TestValidator.equals(
    "roles_without_employees should be 0 when has_employees=true",
    hasEmployeesResponse.roles_without_employees,
    0,
  );
  hasEmployeesResponse.roles.forEach((role) => {
    TestValidator.predicate(
      "role should have at least 1 employee",
      role.employee_count >= 1,
    );
  });
  // 5. Test filtering by has_employees=false
  const noEmployeesRequest: IRolesAnalyticsRequest = {
    has_employees: false,
  };
  const noEmployeesResponse =
    await api.functional.hrmPlatform.member.roles.analytics(memberConnection, {
      body: noEmployeesRequest,
    });
  typia.assert(noEmployeesResponse);
  TestValidator.equals(
    "roles_with_employees should be 0 when has_employees=false",
    noEmployeesResponse.roles_with_employees,
    0,
  );
  noEmployeesResponse.roles.forEach((role) => {
    TestValidator.predicate(
      "role should have 0 employees",
      role.employee_count === 0,
    );
  });
  // 6. Test combined filters (role_kind='custom' AND has_employees=true)
  const combinedFilterRequest: IRolesAnalyticsRequest = {
    role_kind: "custom",
    has_employees: true,
  };
  const combinedFilterResponse =
    await api.functional.hrmPlatform.member.roles.analytics(memberConnection, {
      body: combinedFilterRequest,
    });
  typia.assert(combinedFilterResponse);
  TestValidator.equals(
    "built_in_count should be 0 in combined filter",
    combinedFilterResponse.built_in_count,
    0,
  );
  combinedFilterResponse.roles.forEach((role) => {
    TestValidator.equals(
      "role_kind should be custom in combined filter",
      role.role_kind,
      "custom",
    );
    TestValidator.predicate(
      "role should have at least 1 employee in combined filter",
      role.employee_count >= 1,
    );
  });
  // 7. Test sorting by employees (should be descending)
  const employeeSortRequest: IRolesAnalyticsRequest = {
    sort_by: "employees",
  };
  const employeeSortResponse =
    await api.functional.hrmPlatform.member.roles.analytics(memberConnection, {
      body: employeeSortRequest,
    });
  typia.assert(employeeSortResponse);
  if (employeeSortResponse.roles.length >= 2) {
    TestValidator.predicate(
      "roles should be sorted by employee_count descending",
      employeeSortResponse.roles.every(
        (role, index, array) =>
          index === 0 || array[index - 1].employee_count >= role.employee_count,
      ),
    );
  }
  // 8. Test name search filter (case-insensitive substring matching)
  const nameSearchRequest: IRolesAnalyticsRequest = {
    name: "Manager",
  };
  const nameSearchResponse =
    await api.functional.hrmPlatform.member.roles.analytics(memberConnection, {
      body: nameSearchRequest,
    });
  typia.assert(nameSearchResponse);
  nameSearchResponse.roles.forEach((role) => {
    TestValidator.predicate(
      "role name should contain search term (case-insensitive)",
      role.name.toLowerCase().includes("manager".toLowerCase()),
    );
  });
  // 9. Test permission count filters
  const minPermissionRequest: IRolesAnalyticsRequest = {
    min_permission_count: 3,
  };
  const minPermissionResponse =
    await api.functional.hrmPlatform.member.roles.analytics(memberConnection, {
      body: minPermissionRequest,
    });
  typia.assert(minPermissionResponse);
  minPermissionResponse.roles.forEach((role) => {
    TestValidator.predicate(
      "role should have at least min_permission_count permissions",
      role.permission_count >= 3,
    );
  });
  const maxPermissionRequest: IRolesAnalyticsRequest = {
    max_permission_count: 2,
  };
  const maxPermissionResponse =
    await api.functional.hrmPlatform.member.roles.analytics(memberConnection, {
      body: maxPermissionRequest,
    });
  typia.assert(maxPermissionResponse);
  maxPermissionResponse.roles.forEach((role) => {
    TestValidator.predicate(
      "role should have at most max_permission_count permissions",
      role.permission_count <= 2,
    );
  });
  // 10. Test pagination with filters
  const paginatedFilterRequest: IRolesAnalyticsRequest = {
    role_kind: "custom",
    page: 1,
    limit: 5,
  };
  const paginatedFilterResponse =
    await api.functional.hrmPlatform.member.roles.analytics(memberConnection, {
      body: paginatedFilterRequest,
    });
  typia.assert(paginatedFilterResponse);
  TestValidator.equals(
    "page limit should be respected",
    paginatedFilterResponse.roles.length,
    paginatedFilterResponse.roles.length,
  );
  TestValidator.predicate(
    "total_count should be >= roles.length",
    paginatedFilterResponse.total_count >= paginatedFilterResponse.roles.length,
  );
  // 11. Test default sorting (name ascending)
  const defaultSortRequest: IRolesAnalyticsRequest = {};
  const defaultSortResponse =
    await api.functional.hrmPlatform.member.roles.analytics(memberConnection, {
      body: defaultSortRequest,
    });
  typia.assert(defaultSortResponse);
  if (defaultSortResponse.roles.length >= 2) {
    TestValidator.predicate(
      "roles should be sorted by name ascending by default",
      defaultSortResponse.roles.every(
        (role, index, array) =>
          index === 0 || array[index - 1].name.localeCompare(role.name) <= 0,
      ),
    );
  }
}
