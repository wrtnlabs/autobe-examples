import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministrator";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that an administrator can filter the administrator list by grade level.
 *
 * This test validates:
 * 1. Filtering by grade='regular' returns only regular administrators
 * 2. Filtering by grade='super' returns only super administrators
 * 3. Pagination works correctly with grade filtering
 * 4. Pagination metadata correctly reflects the filtered count
 */
export async function test_api_administrator_list_grade_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create an administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://test.example.com/admin",
      referrer: "https://test.example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Create additional test administrators to ensure we have data for filtering
  await ArrayUtil.asyncRepeat(3, async () => {
    const newConnection: api.IConnection = { host: connection.host };
    const newAdmin = await authorize_administrator_join(newConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://test.example.com/admin",
        referrer: "https://test.example.com",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
    typia.assert(newAdmin);
  });
  // 3. Test filtering by grade='regular'
  const regularFilterResult =
    await api.functional.shoppingMall.administrator.administrators.index(
      adminConnection,
      {
        body: {
          grade: "regular",
          limit: 10,
          page: 1,
        } satisfies IShoppingMallAdministrator.IRequest,
      },
    );
  typia.assert(regularFilterResult);
  // Validate all returned administrators have grade='regular'
  TestValidator.predicate(
    "All filtered results should have grade 'regular'",
    regularFilterResult.data.every((admin) => admin.grade === "regular"),
  );
  // 4. Test filtering by grade='super'
  const superFilterResult =
    await api.functional.shoppingMall.administrator.administrators.index(
      adminConnection,
      {
        body: {
          grade: "super",
          limit: 10,
          page: 1,
        } satisfies IShoppingMallAdministrator.IRequest,
      },
    );
  typia.assert(superFilterResult);
  // Validate all returned administrators have grade='super' (if any exist)
  // Note: If no super admins exist, the result will be empty, which is valid
  TestValidator.predicate(
    "All filtered results should have grade 'super'",
    superFilterResult.data.every((admin) => admin.grade === "super"),
  );
  // 5. Test pagination with grade filtering
  const paginatedResult =
    await api.functional.shoppingMall.administrator.administrators.index(
      adminConnection,
      {
        body: {
          grade: "regular",
          limit: 2,
          page: 1,
        } satisfies IShoppingMallAdministrator.IRequest,
      },
    );
  typia.assert(paginatedResult);
  // Validate pagination metadata
  TestValidator.equals(
    "Pagination limit should match requested limit",
    paginatedResult.pagination.limit,
    2,
  );
  TestValidator.equals(
    "Current page should be 1",
    paginatedResult.pagination.current,
    1,
  );
  // Validate that returned data count does not exceed limit
  TestValidator.predicate(
    "Returned data count should not exceed limit",
    paginatedResult.data.length <= 2,
  );
  // Validate pagination records count is consistent
  TestValidator.predicate(
    "Records count should be consistent with pagination",
    paginatedResult.pagination.records >= paginatedResult.data.length,
  );
}