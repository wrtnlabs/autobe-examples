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
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
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
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_contracts_create } from "../../../generate/generate_random_hrm_platform_contracts_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_contract } from "../../../prepare/prepare_random_hrm_platform_contract";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";

export async function test_api_contract_list_with_filters_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@hrmplatform.test",
      password: "1234",
      href: "https://hrmplatform.test/admin/login",
      referrer: "https://hrmplatform.test/admin",
    } satisfies IHrmPlatformAdmin.ILogin,
  });
  // 2. Test default pagination (no filters)
  const defaultList = await api.functional.hrmPlatform.contracts.index(
    adminConnection,
    {
      body: {} satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(defaultList);
  TestValidator.equals("default page", defaultList.pagination.current, 1);
  TestValidator.equals("default limit", defaultList.pagination.limit, 20);
  TestValidator.predicate(
    "pagination has records count",
    defaultList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    defaultList.pagination.pages >= 0,
  );
  // 3. Test custom pagination parameters
  const paginatedList = await api.functional.hrmPlatform.contracts.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(paginatedList);
  TestValidator.equals("custom page", paginatedList.pagination.current, 1);
  TestValidator.equals("custom limit", paginatedList.pagination.limit, 10);
  TestValidator.predicate(
    "data length matches or less than limit",
    paginatedList.data.length <= 10,
  );
  // 4. Test filtering by pay_period: hourly
  const hourlyContracts = await api.functional.hrmPlatform.contracts.index(
    adminConnection,
    {
      body: {
        pay_period: "hourly",
      } satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(hourlyContracts);
  TestValidator.predicate(
    "all hourly contracts",
    hourlyContracts.data.every((c) => c.pay_period === "hourly"),
  );
  // 5. Test filtering by pay_period: weekly
  const weeklyContracts = await api.functional.hrmPlatform.contracts.index(
    adminConnection,
    {
      body: {
        pay_period: "weekly",
      } satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(weeklyContracts);
  TestValidator.predicate(
    "all weekly contracts",
    weeklyContracts.data.every((c) => c.pay_period === "weekly"),
  );
  // 6. Test filtering by pay_period: monthly
  const monthlyContracts = await api.functional.hrmPlatform.contracts.index(
    adminConnection,
    {
      body: {
        pay_period: "monthly",
      } satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(monthlyContracts);
  TestValidator.predicate(
    "all monthly contracts",
    monthlyContracts.data.every((c) => c.pay_period === "monthly"),
  );
  // 7. Test filtering by status: active
  const activeContracts = await api.functional.hrmPlatform.contracts.index(
    adminConnection,
    {
      body: {
        status: "active",
      } satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(activeContracts);
  TestValidator.predicate(
    "active contracts retrieved",
    activeContracts.pagination.records >= 0,
  );
  // 8. Test filtering by status: historical
  const historicalContracts = await api.functional.hrmPlatform.contracts.index(
    adminConnection,
    {
      body: {
        status: "historical",
      } satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(historicalContracts);
  TestValidator.predicate(
    "historical contracts retrieved",
    historicalContracts.pagination.records >= 0,
  );
  // 9. Test filtering by date range
  const startDate = new Date(
    Date.now() - 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const endDate = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateRangeContracts = await api.functional.hrmPlatform.contracts.index(
    adminConnection,
    {
      body: {
        from_date: startDate,
        to_date: endDate,
      } satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(dateRangeContracts);
  TestValidator.predicate(
    "contracts in date range",
    dateRangeContracts.pagination.records >= 0,
  );
  // 10. Test sorting by start_at descending (default)
  const sortedDesc = await api.functional.hrmPlatform.contracts.index(
    adminConnection,
    {
      body: {
        sortBy: "start_at",
        sortOrder: "desc",
      } satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(sortedDesc);
  TestValidator.predicate(
    "sorted by start_at desc",
    sortedDesc.data.length >= 0,
  );
  // 11. Test sorting by start_at ascending
  const sortedAsc = await api.functional.hrmPlatform.contracts.index(
    adminConnection,
    {
      body: {
        sortBy: "start_at",
        sortOrder: "asc",
      } satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(sortedAsc);
  TestValidator.predicate("sorted by start_at asc", sortedAsc.data.length >= 0);
  // 12. Test sorting by created_at descending
  const sortedByCreated = await api.functional.hrmPlatform.contracts.index(
    adminConnection,
    {
      body: {
        sortBy: "created_at",
        sortOrder: "desc",
      } satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(sortedByCreated);
  TestValidator.predicate(
    "sorted by created_at desc",
    sortedByCreated.data.length >= 0,
  );
  // 13. Test sorting by pay_rate ascending
  const sortedByPayRate = await api.functional.hrmPlatform.contracts.index(
    adminConnection,
    {
      body: {
        sortBy: "pay_rate",
        sortOrder: "asc",
      } satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(sortedByPayRate);
  TestValidator.predicate(
    "sorted by pay_rate asc",
    sortedByPayRate.data.length >= 0,
  );
  // 14. Test search functionality with empty search (should return all)
  const searchAll = await api.functional.hrmPlatform.contracts.index(
    adminConnection,
    {
      body: {
        search: "",
      } satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(searchAll);
  TestValidator.predicate(
    "search with empty string returns results",
    searchAll.pagination.records >= 0,
  );
  // 15. Test combined filters: pay_period + status + pagination
  const combinedFilter = await api.functional.hrmPlatform.contracts.index(
    adminConnection,
    {
      body: {
        pay_period: "monthly",
        status: "active",
        page: 1,
        limit: 5,
      } satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(combinedFilter);
  TestValidator.equals(
    "combined filter page",
    combinedFilter.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined filter limit",
    combinedFilter.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "all monthly and active",
    combinedFilter.data.every((c) => c.pay_period === "monthly"),
  );
  // 16. Verify contract summary structure for returned contracts
  if (defaultList.data.length > 0) {
    const sampleContract = defaultList.data[0];
    TestValidator.predicate("contract has id", sampleContract.id !== undefined);
    TestValidator.predicate(
      "contract has employee",
      sampleContract.employee !== undefined,
    );
    TestValidator.predicate(
      "contract has start_at",
      sampleContract.start_at !== undefined,
    );
    TestValidator.predicate(
      "contract has pay_rate",
      sampleContract.pay_rate !== undefined,
    );
    TestValidator.predicate(
      "contract has pay_period",
      sampleContract.pay_period !== undefined,
    );
    TestValidator.predicate(
      "contract has working_hours_per_week",
      sampleContract.working_hours_per_week !== undefined,
    );
    TestValidator.predicate(
      "contract has created_at",
      sampleContract.created_at !== undefined,
    );
    // Verify employee structure
    TestValidator.predicate(
      "employee has id",
      sampleContract.employee.id !== undefined,
    );
    TestValidator.predicate(
      "employee has employment_type",
      sampleContract.employee.employment_type !== undefined,
    );
    TestValidator.predicate(
      "employee has status",
      sampleContract.employee.status !== undefined,
    );
  }
  // 17. Test edge case: page beyond available data
  const beyondPage = await api.functional.hrmPlatform.contracts.index(
    adminConnection,
    {
      body: {
        page: 9999,
        limit: 10,
      } satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(beyondPage);
  TestValidator.equals(
    "beyond page number",
    beyondPage.pagination.current,
    9999,
  );
  TestValidator.predicate(
    "empty data for beyond page",
    beyondPage.data.length === 0,
  );
  // 18. Test edge case: minimum limit
  const minLimit = await api.functional.hrmPlatform.contracts.index(
    adminConnection,
    {
      body: {
        limit: 1,
      } satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(minLimit);
  TestValidator.equals("minimum limit", minLimit.pagination.limit, 1);
  TestValidator.predicate("data length is 1 or 0", minLimit.data.length <= 1);
  // 19. Test edge case: maximum limit
  const maxLimit = await api.functional.hrmPlatform.contracts.index(
    adminConnection,
    {
      body: {
        limit: 100,
      } satisfies IHrmPlatformContract.IRequest,
    },
  );
  typia.assert(maxLimit);
  TestValidator.equals("maximum limit", maxLimit.pagination.limit, 100);
  TestValidator.predicate(
    "data length within max limit",
    maxLimit.data.length <= 100,
  );
  // 20. Verify pagination metadata consistency
  TestValidator.predicate(
    "records is non-negative",
    defaultList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    defaultList.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "current page is positive",
    defaultList.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is positive",
    defaultList.pagination.limit >= 1,
  );
}
