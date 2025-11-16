import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryMovementStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryMovementStatistics";
import type { IShoppingMallInventoryMovementStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryMovementStatistics";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that platform-admin inventory movement statistics endpoint enforces
 * authorization.
 *
 * This test ensures that the PATCH
 * /shoppingMall/platformAdmin/inventory/statistics/movements endpoint rejects
 * unauthenticated requests while allowing access for authenticated platform
 * administrators.
 *
 * Steps:
 *
 * 1. Create an unauthenticated clone connection and verify that the statistics
 *    endpoint rejects access with an HTTP authorization error (401/403).
 * 2. Join as a new platform administrator using the platformAdmin join endpoint,
 *    which also establishes an authenticated session on the original
 *    connection.
 * 3. Call the statistics endpoint again with the authenticated platform-admin
 *    connection, asserting that a well-formed paginated statistics response is
 *    returned.
 */
export async function test_api_platform_admin_inventory_statistics_authorization_enforcement(
  connection: api.IConnection,
) {
  // 1. Unauthenticated access should be rejected.
  const unauthenticated: api.IConnection = { ...connection, headers: {} };

  const now = new Date();
  const later = new Date(now.getTime() + 60 * 60 * 1000);

  const unauthenticatedRequestBody = {
    page: 1,
    limit: 10,
    date_from: now.toISOString(),
    date_to: later.toISOString(),
  } satisfies IShoppingMallInventoryMovementStatistics.IRequest;

  await TestValidator.httpError(
    "unauthenticated platform admin statistics access should be denied",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.platformAdmin.inventory.statistics.movements.index(
        unauthenticated,
        { body: unauthenticatedRequestBody },
      );
    },
  );

  // 2. Authenticate as a platform administrator via join.
  const emailLocalPart: string = RandomGenerator.name(1)
    .replace(/\s+/g, "")
    .toLowerCase();

  const adminJoinBody = {
    email: `${emailLocalPart}@example.com`,
    name: RandomGenerator.name(),
    password: "P@ssw0rd!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const authorizedAdmin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: adminJoinBody,
    },
  );
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(authorizedAdmin);

  // 3. Authenticated access should succeed and return paginated statistics.
  const authenticatedRequestBody = {
    page: 1,
    limit: 10,
    date_from: now.toISOString(),
    date_to: later.toISOString(),
  } satisfies IShoppingMallInventoryMovementStatistics.IRequest;

  const pageResult =
    await api.functional.shoppingMall.platformAdmin.inventory.statistics.movements.index(
      connection,
      { body: authenticatedRequestBody },
    );
  typia.assert<IPageIShoppingMallInventoryMovementStatistics>(pageResult);

  const pagination = pageResult.pagination;

  TestValidator.predicate(
    "pagination.limit should be non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.current should be non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.pages should be non-negative",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination.records should be non-negative",
    pagination.records >= 0,
  );

  TestValidator.predicate(
    "data length should not exceed pagination.limit",
    pageResult.data.length <= pagination.limit,
  );
}
