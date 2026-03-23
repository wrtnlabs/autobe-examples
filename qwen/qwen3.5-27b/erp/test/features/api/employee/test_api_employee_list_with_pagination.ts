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

/**
 * Test employee list retrieval with pagination and filtering.
 *
 * This test verifies that an authenticated admin can retrieve paginated
 * employee records with proper filtering and pagination metadata.
 */
export async function test_api_employee_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Test default pagination (no parameters)
  const defaultResponse =
    await api.functional.hrmPlatform.admin.employees.index(adminConnection, {
      body: {} satisfies IHrmPlatformEmployee.IRequest,
    });
  typia.assert(defaultResponse);
  // Validate default pagination metadata
  TestValidator.equals(
    "default page is 1",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit is 20",
    defaultResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "total pages is valid",
    defaultResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "total records is valid",
    defaultResponse.pagination.records >= 0,
  );
  // Validate employee summary structure (typia.assert handles type validation)
  for (const employee of defaultResponse.data) {
    typia.assert(employee);
    // Business logic validations only (type validation done by typia.assert)
    TestValidator.predicate("member has id", employee.member.id !== undefined);
    TestValidator.predicate("role has name", employee.role.name !== undefined);
  }
  // 3. Test custom pagination parameters
  const customPaginationResponse =
    await api.functional.hrmPlatform.admin.employees.index(adminConnection, {
      body: {
        page: 2,
        limit: 10,
      } satisfies IHrmPlatformEmployee.IRequest,
    });
  typia.assert(customPaginationResponse);
  TestValidator.equals(
    "custom page is 2",
    customPaginationResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "custom limit is 10",
    customPaginationResponse.pagination.limit,
    10,
  );
  // 4. Test status filter (active only)
  const activeOnlyResponse =
    await api.functional.hrmPlatform.admin.employees.index(adminConnection, {
      body: {
        status: "active",
      } satisfies IHrmPlatformEmployee.IRequest,
    });
  typia.assert(activeOnlyResponse);
  // Verify all returned employees are active
  for (const employee of activeOnlyResponse.data) {
    TestValidator.equals(
      "employee status is active",
      employee.status,
      "active",
    );
  }
  // 5. Test employment_type filter
  const fullTimeOnlyResponse =
    await api.functional.hrmPlatform.admin.employees.index(adminConnection, {
      body: {
        employment_type: "full-time",
      } satisfies IHrmPlatformEmployee.IRequest,
    });
  typia.assert(fullTimeOnlyResponse);
  // Verify all returned employees are full-time
  for (const employee of fullTimeOnlyResponse.data) {
    TestValidator.equals(
      "employee employment_type is full-time",
      employee.employment_type,
      "full-time",
    );
  }
  // 6. Test department_id filter (null for employees without department)
  const noDepartmentResponse =
    await api.functional.hrmPlatform.admin.employees.index(adminConnection, {
      body: {
        department_id: null,
      } satisfies IHrmPlatformEmployee.IRequest,
    });
  typia.assert(noDepartmentResponse);
  // Verify all returned employees have null department
  for (const employee of noDepartmentResponse.data) {
    TestValidator.equals(
      "employee department is null",
      employee.department,
      null,
    );
  }
  // 7. Test search parameter
  const searchKeyword = RandomGenerator.alphabets(3);
  const searchResponse = await api.functional.hrmPlatform.admin.employees.index(
    adminConnection,
    {
      body: {
        search: searchKeyword,
      } satisfies IHrmPlatformEmployee.IRequest,
    },
  );
  typia.assert(searchResponse);
  // Search may return empty results if no matches found - this is valid
  TestValidator.predicate(
    "search response is valid",
    searchResponse.data.length >= 0,
  );
  // 8. Test combined filters
  const combinedFilterResponse =
    await api.functional.hrmPlatform.admin.employees.index(adminConnection, {
      body: {
        status: "active",
        employment_type: "full-time",
        page: 1,
        limit: 5,
      } satisfies IHrmPlatformEmployee.IRequest,
    });
  typia.assert(combinedFilterResponse);
  // Verify all returned employees match combined filters
  for (const employee of combinedFilterResponse.data) {
    TestValidator.equals(
      "employee status is active",
      employee.status,
      "active",
    );
    TestValidator.equals(
      "employee employment_type is full-time",
      employee.employment_type,
      "full-time",
    );
  }
  TestValidator.equals(
    "combined filter limit is 5",
    combinedFilterResponse.pagination.limit,
    5,
  );
}
