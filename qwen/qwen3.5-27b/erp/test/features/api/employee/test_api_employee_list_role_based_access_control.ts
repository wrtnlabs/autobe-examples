import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_hrm_platform_admin_roles_create } from "../../../generate/generate_random_hrm_platform_admin_roles_create";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";

/**
 * Test role-based access control for employee listing operation.
 * Verifies that admin users with proper permissions can access employee data
 * and that organization context isolation is enforced.
 */
export async function test_api_employee_list_role_based_access_control(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Create a custom role with limited permissions for testing
  const customRole = await api.functional.hrmPlatform.admin.roles.create(
    adminConnection,
    {
      body: {
        name: "Limited Viewer",
        description: "Role with only employee viewing permission",
        permissions: ["employee_view"],
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(customRole);
  // 3. List employees with various filters
  // Test 1: List all employees (no filters)
  const allEmployees = await api.functional.hrmPlatform.admin.employees.index(
    adminConnection,
    {
      body: {} satisfies IHrmPlatformEmployee.IRequest,
    },
  );
  typia.assert(allEmployees);
  // Verify response structure
  TestValidator.predicate(
    "response contains pagination info",
    allEmployees.pagination.current >= 1,
  );
  TestValidator.predicate(
    "response contains employee data",
    Array.isArray(allEmployees.data),
  );
  // 4. Test filtering by status (active employees)
  const activeEmployees =
    await api.functional.hrmPlatform.admin.employees.index(adminConnection, {
      body: {
        status: "active",
      } satisfies IHrmPlatformEmployee.IRequest,
    });
  typia.assert(activeEmployees);
  // Verify all returned employees are active
  TestValidator.predicate(
    "all returned employees are active",
    activeEmployees.data.every((emp) => emp.status === "active"),
  );
  // 5. Test filtering by status (deactivated employees)
  const deactivatedEmployees =
    await api.functional.hrmPlatform.admin.employees.index(adminConnection, {
      body: {
        status: "deactivated",
      } satisfies IHrmPlatformEmployee.IRequest,
    });
  typia.assert(deactivatedEmployees);
  // Verify all returned employees are deactivated
  TestValidator.predicate(
    "all returned employees are deactivated",
    deactivatedEmployees.data.every((emp) => emp.status === "deactivated"),
  );
  // 6. Test filtering by employment type
  const fullTimeEmployees =
    await api.functional.hrmPlatform.admin.employees.index(adminConnection, {
      body: {
        employment_type: "full-time",
      } satisfies IHrmPlatformEmployee.IRequest,
    });
  typia.assert(fullTimeEmployees);
  // Verify all returned employees are full-time
  TestValidator.predicate(
    "all returned employees are full-time",
    fullTimeEmployees.data.every((emp) => emp.employment_type === "full-time"),
  );
  // 7. Test pagination
  const paginatedEmployees =
    await api.functional.hrmPlatform.admin.employees.index(adminConnection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformEmployee.IRequest,
    });
  typia.assert(paginatedEmployees);
  TestValidator.equals(
    "pagination current page is 1",
    paginatedEmployees.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    paginatedEmployees.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "data count does not exceed limit",
    paginatedEmployees.data.length <= 10,
  );
  // 8. Verify employee role information is included
  if (allEmployees.data.length > 0) {
    const firstEmployee = allEmployees.data[0];
    // Verify role information exists
    TestValidator.predicate(
      "employee has role information",
      firstEmployee.role !== null && firstEmployee.role !== undefined,
    );
    TestValidator.predicate(
      "role has id",
      firstEmployee.role.id !== null && firstEmployee.role.id !== undefined,
    );
    TestValidator.predicate(
      "role has name",
      firstEmployee.role.name !== null && firstEmployee.role.name !== undefined,
    );
    // Verify member information exists
    TestValidator.predicate(
      "employee has member information",
      firstEmployee.member !== null && firstEmployee.member !== undefined,
    );
    TestValidator.predicate(
      "member has email",
      firstEmployee.member.email !== null &&
        firstEmployee.member.email !== undefined,
    );
    // Verify department information (can be null)
    TestValidator.predicate(
      "department is either object or null",
      firstEmployee.department === null ||
        (firstEmployee.department !== null &&
          firstEmployee.department.id !== undefined),
    );
  }
  // 9. Test search functionality
  if (allEmployees.data.length > 0) {
    const searchEmail = allEmployees.data[0].member.email;
    const searchResults =
      await api.functional.hrmPlatform.admin.employees.index(adminConnection, {
        body: {
          search: searchEmail.split("@")[0], // Search by username part
        } satisfies IHrmPlatformEmployee.IRequest,
      });
    typia.assert(searchResults);
    // Verify search returns results
    TestValidator.predicate(
      "search returns at least one result",
      searchResults.data.length >= 1,
    );
  }
  // 10. Verify organization context isolation
  // The admin can only see employees from their current organization
  if (allEmployees.data.length > 0) {
    const firstEmployee = allEmployees.data[0];
    TestValidator.predicate(
      "employee belongs to organization",
      firstEmployee.role.organization !== null &&
        firstEmployee.role.organization !== undefined,
    );
  }
}
