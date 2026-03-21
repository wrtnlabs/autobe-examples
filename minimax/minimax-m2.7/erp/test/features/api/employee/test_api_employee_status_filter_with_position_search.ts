import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_employee_status_filter_with_position_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Test filtering employees by status='deactivated' and position partial search
  const deactivatedEngineersPage =
    await api.functional.erpHrm.admin.employees.index(adminConnection, {
      body: {
        status: "deactivated",
        position: "Engineer",
      } satisfies IErpHrmEmployee.IRequest,
    });
  typia.assert(deactivatedEngineersPage);
  // 3. Verify all returned employees have status='deactivated' and position contains 'Engineer'
  for (const employee of deactivatedEngineersPage.data) {
    TestValidator.equals(
      "employee status is deactivated",
      employee.status,
      "deactivated",
    );
    TestValidator.predicate(
      "position contains Engineer",
      employee.position !== null &&
        employee.position !== undefined &&
        employee.position.toLowerCase().includes("engineer"),
    );
  }
  // 4. Test sorting by position field with ascending order
  const sortedByPositionAsc = await api.functional.erpHrm.admin.employees.index(
    adminConnection,
    {
      body: {
        status: "deactivated",
        position: "Engineer",
        orderBy: "position",
        order: "asc",
      } satisfies IErpHrmEmployee.IRequest,
    },
  );
  typia.assert(sortedByPositionAsc);
  // 5. Verify sorting order is correct (A-Z)
  if (sortedByPositionAsc.data.length > 1) {
    for (let i = 1; i < sortedByPositionAsc.data.length; i++) {
      const prev = sortedByPositionAsc.data[i - 1].position ?? "";
      const curr = sortedByPositionAsc.data[i].position ?? "";
      TestValidator.predicate(
        "position is sorted ascending",
        prev.localeCompare(curr) <= 0,
      );
    }
  }
  // 6. Test sorting by position field with descending order
  const sortedByPositionDesc =
    await api.functional.erpHrm.admin.employees.index(adminConnection, {
      body: {
        status: "deactivated",
        position: "Engineer",
        orderBy: "position",
        order: "desc",
      } satisfies IErpHrmEmployee.IRequest,
    });
  typia.assert(sortedByPositionDesc);
  // 7. Verify sorting order is correct (Z-A)
  if (sortedByPositionDesc.data.length > 1) {
    for (let i = 1; i < sortedByPositionDesc.data.length; i++) {
      const prev = sortedByPositionDesc.data[i - 1].position ?? "";
      const curr = sortedByPositionDesc.data[i].position ?? "";
      TestValidator.predicate(
        "position is sorted descending",
        prev.localeCompare(curr) >= 0,
      );
    }
  }
  // 8. Compare ascending and descending results are reversed
  TestValidator.equals(
    "ascending and descending results have same length",
    sortedByPositionAsc.data.length,
    sortedByPositionDesc.data.length,
  );
  // 9. Test with different position search term to ensure partial matching works
  const managerResults = await api.functional.erpHrm.admin.employees.index(
    adminConnection,
    {
      body: {
        status: "deactivated",
        position: "Manager",
      } satisfies IErpHrmEmployee.IRequest,
    },
  );
  typia.assert(managerResults);
  for (const employee of managerResults.data) {
    TestValidator.equals(
      "employee status is deactivated",
      employee.status,
      "deactivated",
    );
    TestValidator.predicate(
      "position contains Manager",
      employee.position !== null &&
        employee.position !== undefined &&
        employee.position.toLowerCase().includes("manager"),
    );
  }
  // 10. Verify soft-deleted records are included (deleted_at IS NOT NULL)
  for (const employee of deactivatedEngineersPage.data) {
    TestValidator.predicate(
      "deactivated employee has deleted_at set",
      employee.deleted_at !== null && employee.deleted_at !== undefined,
    );
  }
}
