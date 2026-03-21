import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test filtering departments by parent department to verify hierarchy functionality.
 *
 * This test verifies that the department list endpoint correctly filters results
 * by parent department ID, returning only child departments belonging to the specified
 * parent. The test authenticates as admin, retrieves departments with a parentId filter,
 * and validates the response structure and data.
 */
export async function test_api_department_list_hierarchy_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Get all departments to find one with a parent
  const allDepartments = await api.functional.erpHrm.admin.departments.index(
    adminConnection,
    {
      body: {
        limit: 100,
        includeInactive: false,
      } satisfies IErpHrmDepartment.IRequest,
    },
  );
  typia.assert(allDepartments);
  // 3. Find a department that has a parent (child department)
  const childDepartment = allDepartments.data.find(
    (dept) => dept.parent !== null && dept.parent !== undefined,
  );
  // If no child departments exist, skip this test
  if (!childDepartment) {
    console.log(
      "No department with parent found - skipping hierarchy filtering test",
    );
    return;
  }
  // 4. Filter departments by parentId
  const filteredDepartments =
    await api.functional.erpHrm.admin.departments.index(adminConnection, {
      body: {
        parentId: childDepartment.parent!.id,
        limit: 100,
        includeInactive: false,
      } satisfies IErpHrmDepartment.IRequest,
    });
  typia.assert(filteredDepartments);
  // 5. Validations
  // Verify pagination reflects correct count
  TestValidator.equals(
    "pagination records should match data length",
    filteredDepartments.pagination.records,
    filteredDepartments.data.length,
  );
  // Verify all returned departments have the correct parent
  for (const dept of filteredDepartments.data) {
    TestValidator.equals(
      "department parent.id should match filter",
      dept.parent?.id,
      childDepartment.parent!.id,
    );
  }
  // Verify the original child department is in the results
  const foundChild = filteredDepartments.data.find(
    (dept) => dept.id === childDepartment.id,
  );
  TestValidator.predicate(
    "original child department should be in filtered results",
    foundChild !== null && foundChild !== undefined,
  );
  // Verify departments are sorted alphabetically by name (default sort)
  for (let i = 1; i < filteredDepartments.data.length; i++) {
    TestValidator.predicate(
      "departments should be sorted alphabetically by name",
      filteredDepartments.data[i - 1].name.localeCompare(
        filteredDepartments.data[i].name,
      ) <= 0,
    );
  }
}
