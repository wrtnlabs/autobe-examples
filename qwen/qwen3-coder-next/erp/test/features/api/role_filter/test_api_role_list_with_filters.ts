import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_role_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Filter by is_custom=true (custom roles)
  const customRoles = await api.functional.hrmTracker.roles.index(connection, {
    body: {
      name: "",
      is_custom: true,
      is_default: false,
      page: 1,
      limit: 10,
    } satisfies IHrmTrackerRole.IRequest,
  });
  typia.assert(customRoles);
  // Validate all returned roles are custom
  customRoles.data.forEach((role) => {
    TestValidator.equals("role is_custom is true", role.is_custom, true);
  });
  // Test 2: Filter by is_default=true (default roles)
  const defaultRoles = await api.functional.hrmTracker.roles.index(connection, {
    body: {
      name: "",
      is_custom: false,
      is_default: true,
      page: 1,
      limit: 10,
    } satisfies IHrmTrackerRole.IRequest,
  });
  typia.assert(defaultRoles);
  // Validate all returned roles are default
  defaultRoles.data.forEach((role) => {
    TestValidator.equals("role is_default is true", role.is_default, true);
  });
  // Test 3: Pagination with filters
  const paginatedRoles = await api.functional.hrmTracker.roles.index(
    connection,
    {
      body: {
        name: "",
        is_custom: false,
        is_default: false,
        page: 2,
        limit: 10,
      } satisfies IHrmTrackerRole.IRequest,
    },
  );
  typia.assert(paginatedRoles);
  // Validate pagination parameters
  TestValidator.equals(
    "pagination has correct page",
    paginatedRoles.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination has correct limit",
    paginatedRoles.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination has valid records",
    paginatedRoles.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages",
    paginatedRoles.pagination.pages >= 0,
  );
  // Test 4: Combined filters
  const combinedFilter = await api.functional.hrmTracker.roles.index(
    connection,
    {
      body: {
        name: "employee",
        is_custom: false,
        is_default: false,
        page: 1,
        limit: 5,
      } satisfies IHrmTrackerRole.IRequest,
    },
  );
  typia.assert(combinedFilter);
  // Validate results match filters (is_custom and is_default are exact matches)
  combinedFilter.data.forEach((role) => {
    TestValidator.equals("combined filter is_custom", role.is_custom, false);
    TestValidator.equals("combined filter is_default", role.is_default, false);
  });
}
