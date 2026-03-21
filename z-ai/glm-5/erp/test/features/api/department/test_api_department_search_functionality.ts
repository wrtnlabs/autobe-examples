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

export async function test_api_department_search_functionality(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create test departments with distinct names for search testing
  const departmentNames: string[] = [
    "Engineering",
    "Marketing",
    "Human Resources",
    "Engineering Support",
  ];
  const createdDepartments = await ArrayUtil.asyncMap(
    departmentNames,
    async (name: string) => {
      const department =
        await generate_random_erp_hrm_member_departments_create(
          memberConnection,
          { body: { name } },
        );
      typia.assert(department);
      return department;
    },
  );
  // 3. Test case-insensitive partial match: Search for 'Engine' should return both 'Engineering' and 'Engineering Support'
  const engineSearchResult =
    await api.functional.erpHrm.member.departments.index(memberConnection, {
      body: { search: "Engine" } satisfies IErpHrmDepartment.IRequest,
    });
  typia.assert(engineSearchResult);
  TestValidator.equals(
    "Engine search result count",
    engineSearchResult.data.length,
    2,
  );
  TestValidator.predicate(
    "Engine search contains Engineering",
    engineSearchResult.data.some((d) => d.name === "Engineering"),
  );
  TestValidator.predicate(
    "Engine search contains Engineering Support",
    engineSearchResult.data.some((d) => d.name === "Engineering Support"),
  );
  // 4. Test case-insensitive matching: Search for 'marketing' (lowercase) should return 'Marketing'
  const marketingSearchResult =
    await api.functional.erpHrm.member.departments.index(memberConnection, {
      body: { search: "marketing" } satisfies IErpHrmDepartment.IRequest,
    });
  typia.assert(marketingSearchResult);
  TestValidator.equals(
    "marketing search result count",
    marketingSearchResult.data.length,
    1,
  );
  TestValidator.equals(
    "marketing search result name",
    marketingSearchResult.data[0].name,
    "Marketing",
  );
  // 5. Test no-match search: Search for 'xyz' should return empty data array but valid pagination structure
  const noMatchSearchResult =
    await api.functional.erpHrm.member.departments.index(memberConnection, {
      body: { search: "xyz" } satisfies IErpHrmDepartment.IRequest,
    });
  typia.assert(noMatchSearchResult);
  TestValidator.equals(
    "xyz search result count",
    noMatchSearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "xyz search pagination current",
    noMatchSearchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "xyz search pagination records",
    noMatchSearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "xyz search pagination pages",
    noMatchSearchResult.pagination.pages,
    0,
  );
  // 6. Test search with pagination: Combine search with page and limit parameters
  const paginatedSearchResult =
    await api.functional.erpHrm.member.departments.index(memberConnection, {
      body: {
        search: "Engine",
        page: 1,
        limit: 10,
      } satisfies IErpHrmDepartment.IRequest,
    });
  typia.assert(paginatedSearchResult);
  TestValidator.equals(
    "paginated search current page",
    paginatedSearchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "paginated search limit",
    paginatedSearchResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "paginated search result count",
    paginatedSearchResult.data.length,
    2,
  );
}
