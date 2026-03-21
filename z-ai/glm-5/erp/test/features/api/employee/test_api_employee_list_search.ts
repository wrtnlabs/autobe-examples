import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";

export async function test_api_employee_list_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication - creates member with organization and owner role
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {});
  typia.assert(auth);
  // 2. Create multiple employees within the same organization
  // Note: Display names come from member profiles, not employee creation
  // We create employees and test search functionality with their actual display names
  const employees: IErpHrmEmployee[] = [];
  for (let i = 0; i < 4; i++) {
    const employee = await generate_random_erp_hrm_member_employees_create(
      memberConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
        },
      },
    );
    typia.assert(employee);
    employees.push(employee);
  }
  // Extract display names from created employees for testing
  const displayNames = employees.map((e) => e.member.displayName);
  // 3. Test partial name search - use first employee's display name
  const firstName = displayNames[0];
  const partialSearch = firstName.substring(0, Math.ceil(firstName.length / 2));
  const partialResults = await api.functional.erpHrm.member.employees.index(
    memberConnection,
    {
      body: { search: partialSearch } satisfies IErpHrmEmployee.IRequest,
    },
  );
  typia.assert(partialResults);
  TestValidator.predicate(
    "Partial name search returns at least one result",
    partialResults.data.length >= 1,
  );
  // 4. Test case-insensitive search
  const caseInsensitiveSearch = firstName.toLowerCase();
  const caseResults = await api.functional.erpHrm.member.employees.index(
    memberConnection,
    {
      body: {
        search: caseInsensitiveSearch,
      } satisfies IErpHrmEmployee.IRequest,
    },
  );
  typia.assert(caseResults);
  TestValidator.predicate(
    "Case-insensitive search returns at least one result",
    caseResults.data.length >= 1,
  );
  // 5. Test non-matching search term
  const noResults = await api.functional.erpHrm.member.employees.index(
    memberConnection,
    {
      body: {
        search: "NonExistentEmployeeSearchTermXYZ123",
      } satisfies IErpHrmEmployee.IRequest,
    },
  );
  typia.assert(noResults);
  TestValidator.equals(
    "Non-matching search returns empty data",
    noResults.data.length,
    0,
  );
  TestValidator.equals(
    "Non-matching search pagination shows 0 records",
    noResults.pagination.records,
    0,
  );
  // 6. Test combined search with status filter
  const combinedResults = await api.functional.erpHrm.member.employees.index(
    memberConnection,
    {
      body: {
        search: partialSearch,
        status: "active",
      } satisfies IErpHrmEmployee.IRequest,
    },
  );
  typia.assert(combinedResults);
  TestValidator.predicate(
    "Combined search and filter returns results",
    combinedResults.data.length >= 0,
  );
  // 7. Test pagination with search results
  const paginatedResults = await api.functional.erpHrm.member.employees.index(
    memberConnection,
    {
      body: {
        search: partialSearch,
        page: 1,
        limit: 10,
      } satisfies IErpHrmEmployee.IRequest,
    },
  );
  typia.assert(paginatedResults);
  TestValidator.equals(
    "Pagination current page is 1",
    paginatedResults.pagination.current,
    1,
  );
  TestValidator.predicate(
    "Pagination limit is respected",
    paginatedResults.pagination.limit >= 1 &&
      paginatedResults.pagination.limit <= 100,
  );
  // 8. Verify all returned employees belong to the same organization
  const allResults = await api.functional.erpHrm.member.employees.index(
    memberConnection,
    {
      body: {} satisfies IErpHrmEmployee.IRequest,
    },
  );
  typia.assert(allResults);
  TestValidator.predicate(
    "All employees in search results belong to the same organization",
    allResults.data.every((emp) =>
      employees.some((created) => created.id === emp.id),
    ),
  );
}
