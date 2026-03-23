import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test pagination and sorting capabilities of the role list endpoint.
 *
 * This test validates:
 * 1. Pagination functionality with various page and limit combinations
 * 2. Sorting by name, created_at, and updated_at fields
 * 3. Sort order (ascending and descending)
 * 4. Edge cases (minimum/maximum limits, beyond total pages)
 */
export async function test_api_role_list_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // Test 1: Basic pagination - page=1, limit=10
  const page1Result = await api.functional.hrmPlatform.admin.roles.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(page1Result);
  TestValidator.equals(
    "page 1 returns correct limit",
    page1Result.data.length,
    10,
  );
  TestValidator.equals(
    "page 1 current page is 1",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit is 10", page1Result.pagination.limit, 10);
  TestValidator.predicate(
    "page 1 has valid total records",
    page1Result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pages calculated correctly",
    page1Result.pagination.pages ===
      Math.ceil(page1Result.pagination.records / page1Result.pagination.limit),
  );
  // Test 2: Pagination - page=2, limit=10
  const page2Result = await api.functional.hrmPlatform.admin.roles.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 current page is 2",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit is 10", page2Result.pagination.limit, 10);
  // Verify different roles between page 1 and page 2
  const page1Ids = page1Result.data.map((r) => r.id);
  const page2Ids = page2Result.data.map((r) => r.id);
  const hasOverlap = page1Ids.some((id) => page2Ids.includes(id));
  TestValidator.predicate(
    "page 1 and page 2 have no overlapping roles",
    !hasOverlap,
  );
  // Test 3: Pagination - beyond total pages
  const beyondPages = page1Result.pagination.pages + 1;
  const beyondResult = await api.functional.hrmPlatform.admin.roles.index(
    adminConnection,
    {
      body: {
        page: beyondPages,
        limit: 10,
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(beyondResult);
  TestValidator.equals(
    "beyond pages returns empty data",
    beyondResult.data.length,
    0,
  );
  TestValidator.equals(
    "beyond pages current page is correct",
    beyondResult.pagination.current,
    beyondPages,
  );
  // Test 4: Sorting by name ascending
  const sortNameAsc = await api.functional.hrmPlatform.admin.roles.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort: "name",
        order: "asc",
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(sortNameAsc);
  // Verify ascending order
  for (let i = 1; i < sortNameAsc.data.length; i++) {
    TestValidator.predicate(
      `name sort asc: role ${i - 1} <= role ${i}`,
      sortNameAsc.data[i - 1].name.localeCompare(sortNameAsc.data[i].name) <= 0,
    );
  }
  // Test 5: Sorting by name descending
  const sortNameDesc = await api.functional.hrmPlatform.admin.roles.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort: "name",
        order: "desc",
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(sortNameDesc);
  // Verify descending order
  for (let i = 1; i < sortNameDesc.data.length; i++) {
    TestValidator.predicate(
      `name sort desc: role ${i - 1} >= role ${i}`,
      sortNameDesc.data[i - 1].name.localeCompare(sortNameDesc.data[i].name) >=
        0,
    );
  }
  // Test 6: Sorting by created_at descending (newest first)
  const sortCreatedAtDesc = await api.functional.hrmPlatform.admin.roles.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort: "created_at",
        order: "desc",
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(sortCreatedAtDesc);
  // Verify descending date order
  for (let i = 1; i < sortCreatedAtDesc.data.length; i++) {
    const prevDate = new Date(
      sortCreatedAtDesc.data[i - 1].created_at,
    ).getTime();
    const currDate = new Date(sortCreatedAtDesc.data[i].created_at).getTime();
    TestValidator.predicate(
      `created_at sort desc: role ${i - 1} >= role ${i}`,
      prevDate >= currDate,
    );
  }
  // Test 7: Sorting by created_at ascending (oldest first)
  const sortCreatedAtAsc = await api.functional.hrmPlatform.admin.roles.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort: "created_at",
        order: "asc",
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(sortCreatedAtAsc);
  // Verify ascending date order
  for (let i = 1; i < sortCreatedAtAsc.data.length; i++) {
    const prevDate = new Date(
      sortCreatedAtAsc.data[i - 1].created_at,
    ).getTime();
    const currDate = new Date(sortCreatedAtAsc.data[i].created_at).getTime();
    TestValidator.predicate(
      `created_at sort asc: role ${i - 1} <= role ${i}`,
      prevDate <= currDate,
    );
  }
  // Test 8: Sorting by updated_at descending
  const sortUpdatedAtDesc = await api.functional.hrmPlatform.admin.roles.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort: "updated_at",
        order: "desc",
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(sortUpdatedAtDesc);
  // Verify descending date order using updated_at field
  for (let i = 1; i < sortUpdatedAtDesc.data.length; i++) {
    const prevDate = new Date(
      sortUpdatedAtDesc.data[i - 1].created_at,
    ).getTime();
    const currDate = new Date(sortUpdatedAtDesc.data[i].created_at).getTime();
    TestValidator.predicate(
      `updated_at sort desc: role ${i - 1} >= role ${i}`,
      prevDate >= currDate,
    );
  }
  // Test 9: Edge case - maximum limit (100)
  const maxLimitResult = await api.functional.hrmPlatform.admin.roles.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(maxLimitResult);
  TestValidator.equals(
    "max limit pagination limit is 100",
    maxLimitResult.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "max limit returns correct data count",
    maxLimitResult.data.length <= 100,
  );
  // Test 10: Edge case - minimum limit (1)
  const minLimitResult = await api.functional.hrmPlatform.admin.roles.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(minLimitResult);
  TestValidator.equals(
    "min limit returns exactly 1 role",
    minLimitResult.data.length,
    1,
  );
  TestValidator.equals(
    "min limit pagination limit is 1",
    minLimitResult.pagination.limit,
    1,
  );
  // Test 11: Edge case - minimum page (1)
  const minPageResult = await api.functional.hrmPlatform.admin.roles.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(minPageResult);
  TestValidator.equals(
    "min page returns page 1",
    minPageResult.pagination.current,
    1,
  );
}
