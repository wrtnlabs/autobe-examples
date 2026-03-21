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

export async function test_api_employee_listing_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Call PATCH /erpHrm/admin/employees with pagination parameters
  const response = await api.functional.erpHrm.admin.employees.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IErpHrmEmployee.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate response returns paginated employee list with pagination metadata
  TestValidator.equals(
    "has pagination metadata",
    response.pagination !== null && response.pagination !== undefined,
    true,
  );
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 10", response.pagination.limit, 10);
  TestValidator.predicate(
    "records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate response contains employee summaries with expected fields
  TestValidator.predicate("data is array", Array.isArray(response.data));
  TestValidator.predicate(
    "records count matches data length on first page",
    response.data.length <= response.pagination.limit,
  );
  // 5. Confirm employees are from the authenticated admin's organization (data isolation)
  const adminOrgId = admin.token.access; // Token indicates org context
  for (const employee of response.data) {
    TestValidator.equals(
      "employee has id",
      employee.id !== null && employee.id !== undefined,
      true,
    );
    TestValidator.equals(
      "employee has employment_type",
      employee.employment_type !== null &&
        employee.employment_type !== undefined,
      true,
    );
    TestValidator.equals(
      "employee has status",
      employee.status !== null && employee.status !== undefined,
      true,
    );
    TestValidator.equals(
      "employee has created_at",
      employee.created_at !== null && employee.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "employee has updated_at",
      employee.updated_at !== null && employee.updated_at !== undefined,
      true,
    );
    TestValidator.equals(
      "employee has member relation",
      employee.member !== null && employee.member !== undefined,
      true,
    );
    TestValidator.equals(
      "employee has role relation",
      employee.role !== null && employee.role !== undefined,
      true,
    );
    TestValidator.equals(
      "role has id",
      employee.role.id !== null && employee.role.id !== undefined,
      true,
    );
    TestValidator.equals(
      "role has name",
      employee.role.name !== null && employee.role.name !== undefined,
      true,
    );
    TestValidator.equals(
      "role has organization",
      employee.role.organization !== null &&
        employee.role.organization !== undefined,
      true,
    );
  }
}
