import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_departments_create } from "../../../generate/generate_random_erp_hrm_member_departments_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";

/**
 * Test basic department list browsing with default pagination and data structure validation.
 *
 * Validates that an authenticated member can retrieve a paginated department list
 * with default parameters, no filters applied. The test creates three top-level
 * departments and verifies they all appear in the listing response with correct
 * summary fields and pagination metadata.
 *
 * 1. A new member authenticates via authorize_member_join.
 * 2. Three departments — Engineering, Sales, HR — are created as top-level entries.
 * 3. The department index endpoint is called with an empty request body (default parameters).
 * 4. The response is validated: all three departments are present, each record
 *    includes id, name, description, null parent, children_count, created_at, and
 *    updated_at; pagination shows correct current page (1), positive limit, records
 *    count (≥ 3), and pages (≥ 1).
 */
export async function test_api_department_list_basic_browsing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create three top-level departments with distinct names
  const engineering = await generate_random_erp_hrm_member_departments_create(
    memberConnection,
    { body: { name: "Engineering" } },
  );
  typia.assert(engineering);
  const sales = await generate_random_erp_hrm_member_departments_create(
    memberConnection,
    { body: { name: "Sales" } },
  );
  typia.assert(sales);
  const hr = await generate_random_erp_hrm_member_departments_create(
    memberConnection,
    { body: { name: "HR" } },
  );
  typia.assert(hr);
  // 3. List departments with default parameters (no filters, default pagination)
  const page = await api.functional.erpHrm.member.departments.index(
    memberConnection,
    { body: {} },
  );
  typia.assert(page);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "current page is 1 with default parameters",
    page.pagination.current,
    1,
  );
  TestValidator.predicate("page limit is positive", page.pagination.limit > 0);
  TestValidator.predicate(
    "records count covers at least the three created departments",
    page.pagination.records >= 3,
  );
  TestValidator.predicate(
    "total pages is at least 1",
    page.pagination.pages >= 1,
  );
  // 5. Validate all three created departments are present in the listing
  const departmentNames = page.data.map((d) => d.name);
  TestValidator.predicate(
    "Engineering department appears in listing",
    departmentNames.includes("Engineering"),
  );
  TestValidator.predicate(
    "Sales department appears in listing",
    departmentNames.includes("Sales"),
  );
  TestValidator.predicate(
    "HR department appears in listing",
    departmentNames.includes("HR"),
  );
  // 6. Validate each department record has null parent (top-level) and proper structure
  for (const dept of [engineering, sales, hr]) {
    const listed = page.data.find((d) => d.id === dept.id);
    TestValidator.predicate(
      `department "${dept.name}" found in listing by id`,
      listed !== undefined,
    );
    if (listed) {
      TestValidator.equals(
        `department "${dept.name}" parent is null (top-level)`,
        listed.parent,
        null,
      );
      TestValidator.equals(
        `department "${dept.name}" name matches created value`,
        listed.name,
        dept.name,
      );
    }
  }
}
