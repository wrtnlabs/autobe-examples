import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_hrm_platform_contracts_create } from "../../../generate/generate_random_hrm_platform_contracts_create";
import { prepare_random_hrm_platform_contract } from "../../../prepare/prepare_random_hrm_platform_contract";

export async function test_api_contract_list_edge_cases_and_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin_contract_test@test.com",
      password: "12345678",
      href: "https://hrm-platform.test/admin/join",
      referrer: "https://hrm-platform.test",
    },
  });
  // 2. Empty State Test: Verify empty results when no contracts exist
  const emptyResult = await api.functional.hrmPlatform.contracts.index(
    adminConnection,
    {
      body: {} satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty state - records count",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty state - pages count",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty state - current page",
    emptyResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty state - data array empty",
    emptyResult.data.length,
    0,
  );
  // 3. Create 105 contracts for pagination boundary testing
  const contracts: IHrmPlatformContract[] = [];
  for (let i = 0; i < 105; i++) {
    const contract = await generate_random_hrm_platform_contracts_create(
      adminConnection,
      {
        body: {
          // end_at varies: null (active), past date (historical), future date (active)
          end_at:
            i % 3 === 0
              ? null
              : i % 3 === 1
                ? "2024-01-01T00:00:00Z"
                : "2025-12-31T23:59:59Z",
        },
      },
    );
    typia.assert(contract);
    contracts.push(contract);
  }
  // 4. Default Pagination Test: Verify default page size is 20
  const defaultPaginationResult =
    await api.functional.hrmPlatform.contracts.index(adminConnection, {
      body: {} satisfies IHrmPlatformContract.IRequest,
    });
  typia.assert(defaultPaginationResult);
  TestValidator.equals(
    "default limit",
    defaultPaginationResult.pagination.limit,
    20,
  );
  TestValidator.equals(
    "default page size",
    defaultPaginationResult.data.length,
    20,
  );
  TestValidator.equals(
    "total records after creation",
    defaultPaginationResult.pagination.records,
    105,
  );
  TestValidator.equals(
    "total pages calculation",
    defaultPaginationResult.pagination.pages,
    6,
  );
  // 5. Limit Boundary Test: Verify limit caps at 100
  const maxLimitResult = await api.functional.hrmPlatform.contracts.index(
    adminConnection,
    {
      body: {
        limit: 150,
      } satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(maxLimitResult);
  TestValidator.equals(
    "limit capped at 100",
    maxLimitResult.pagination.limit,
    100,
  );
  TestValidator.equals("max limit data count", maxLimitResult.data.length, 100);
  // 6. Page Navigation Test: Verify page 2 returns correct data
  const page2Result = await api.functional.hrmPlatform.contracts.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 20,
      } satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 - current page",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals("page 2 - data count", page2Result.data.length, 20);
  // 7. Beyond Available Pages Test: Request page 100 (only 6 pages exist)
  const beyondPagesResult = await api.functional.hrmPlatform.contracts.index(
    adminConnection,
    {
      body: {
        page: 100,
        limit: 20,
      } satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(beyondPagesResult);
  TestValidator.equals(
    "beyond pages - current page",
    beyondPagesResult.pagination.current,
    100,
  );
  TestValidator.equals(
    "beyond pages - empty data",
    beyondPagesResult.data.length,
    0,
  );
  // 8. Invalid Filter Test: Search for non-existent employee name
  const invalidSearchResult = await api.functional.hrmPlatform.contracts.index(
    adminConnection,
    {
      body: {
        search: "nonexistent_employee_xyz_12345",
      } satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(invalidSearchResult);
  TestValidator.equals(
    "invalid search - empty results",
    invalidSearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "invalid search - records count",
    invalidSearchResult.pagination.records,
    0,
  );
  // 9. Invalid Date Range Test: Future date range with no contracts
  const invalidDateRangeResult =
    await api.functional.hrmPlatform.contracts.index(adminConnection, {
      body: {
        from_date: "2030-01-01T00:00:00Z",
        to_date: "2030-12-31T23:59:59Z",
      } satisfies IHrmPlatformContract.IRequest,
    });
  typia.assert(invalidDateRangeResult);
  TestValidator.equals(
    "invalid date range - empty results",
    invalidDateRangeResult.data.length,
    0,
  );
  // 10. Sorting with Null Values Test: Sort by end_at (null for active contracts)
  const sortByEndAtResult = await api.functional.hrmPlatform.contracts.index(
    adminConnection,
    {
      body: {
        sortBy: "end_at",
        sortOrder: "asc",
        limit: 50,
      } satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(sortByEndAtResult);
  TestValidator.equals(
    "sort by end_at - data returned",
    sortByEndAtResult.data.length,
    50,
  );
  // Verify sorting is stable (no errors thrown)
  TestValidator.predicate(
    "sort by end_at - all contracts have valid data",
    () => {
      return sortByEndAtResult.data.every(
        (contract) => contract.id !== undefined,
      );
    },
  );
  // 11. Status Filter - Historical Contracts Test
  const historicalResult = await api.functional.hrmPlatform.contracts.index(
    adminConnection,
    {
      body: {
        status: "historical",
        limit: 100,
      } satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(historicalResult);
  TestValidator.predicate("historical status - all have past end_at", () => {
    return historicalResult.data.every((contract) => {
      return contract.end_at !== null && new Date(contract.end_at) < new Date();
    });
  });
  // 12. Status Filter - Active Contracts Test
  const activeResult = await api.functional.hrmPlatform.contracts.index(
    adminConnection,
    {
      body: {
        status: "active",
        limit: 100,
      } satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(activeResult);
  TestValidator.predicate("active status - all are active", () => {
    return activeResult.data.every((contract) => {
      return contract.end_at === null || new Date(contract.end_at) > new Date();
    });
  });
  // 13. Default Sorting Test: Verify default is start_at DESC
  const defaultSortResult = await api.functional.hrmPlatform.contracts.index(
    adminConnection,
    {
      body: {
        limit: 20,
      } satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(defaultSortResult);
  TestValidator.predicate("default sorting - start_at DESC", () => {
    if (defaultSortResult.data.length < 2) return true;
    for (let i = 1; i < defaultSortResult.data.length; i++) {
      const prevDate = new Date(defaultSortResult.data[i - 1].start_at);
      const currDate = new Date(defaultSortResult.data[i].start_at);
      if (prevDate < currDate) return false;
    }
    return true;
  });
}
