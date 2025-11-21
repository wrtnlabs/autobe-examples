import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_list_filter_updated_at_range(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "securePassword123",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Query all sellers to find at least one existing seller
  const allSellers: IPageIShoppingMallSeller =
    await api.functional.shoppingMall.admin.actors.sellers.index(connection, {
      body: {} satisfies IShoppingMallSeller.IRequest,
    });
  typia.assert(allSellers);

  // Step 3: Verify at least one seller exists in the system
  TestValidator.predicate(
    "at least one seller should exist",
    allSellers.data.length > 0,
  );

  // Step 4: Select the first seller and extract its updated_at timestamp
  const targetSeller = allSellers.data[0];
  const targetUpdatedAt = new Date(targetSeller.updated_at);

  // Step 5: Create a narrow time range around the target timestamp (±1 second)
  // This ensures we filter for exactly that seller
  const rangeStart = new Date(targetUpdatedAt.getTime() - 1000); // 1 second before
  const rangeEnd = new Date(targetUpdatedAt.getTime() + 1000); // 1 second after

  // Step 6: Query sellers within this narrow range
  const queryResult: IPageIShoppingMallSeller =
    await api.functional.shoppingMall.admin.actors.sellers.index(connection, {
      body: {
        updated_at_from: rangeStart.toISOString(),
        updated_at_to: rangeEnd.toISOString(),
      } satisfies IShoppingMallSeller.IRequest,
    });
  typia.assert(queryResult);

  // Step 7: Validate that the target seller is in the filtered results
  TestValidator.equals(
    "filter should return exactly one seller",
    queryResult.data.length,
    1,
  );
  TestValidator.equals(
    "filtered seller should match target seller",
    queryResult.data[0].id,
    targetSeller.id,
  );
  TestValidator.equals(
    "filtered seller updated_at should match target",
    queryResult.data[0].updated_at,
    targetSeller.updated_at,
  );

  // Step 8: Verify that filtering with an empty range returns zero results
  // Choose a date far in the future that no seller should have
  const emptyRangeEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year in future
  const emptyRangeStart = new Date(emptyRangeEnd.getTime() - 1000); // 1 second before

  const emptyResult: IPageIShoppingMallSeller =
    await api.functional.shoppingMall.admin.actors.sellers.index(connection, {
      body: {
        updated_at_from: emptyRangeStart.toISOString(),
        updated_at_to: emptyRangeEnd.toISOString(),
      } satisfies IShoppingMallSeller.IRequest,
    });
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty range should return no sellers",
    emptyResult.data.length,
    0,
  );
}
