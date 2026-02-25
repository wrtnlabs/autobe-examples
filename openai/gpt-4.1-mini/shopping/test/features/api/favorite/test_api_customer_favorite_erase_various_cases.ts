import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_favorite_erase_various_cases(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario 1: Successful deletion of an existing favorite by an authenticated customer.
  // Test scenario 2: Attempt deletion of a non-existent favoriteId by an authenticated customer.
  // Test scenario 3: Attempt deletion of a favorite owned by another customer, verifying authorization failure handling.
  // 1. Setup: customer 1 joins and gets authenticated
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1 = await authorize_customer_join(customer1Connection, {});
  customer1Connection.headers ??= {};
  customer1Connection.headers.Authorization = customer1.token.access;
  // 2. Setup: customer 2 joins and gets authenticated
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2 = await authorize_customer_join(customer2Connection, {});
  customer2Connection.headers ??= {};
  customer2Connection.headers.Authorization = customer2.token.access;
  // 3. Customer 1 creates a favorite (simulate a favorite ID for testing purposes)
  // Since no API provided to create favorite, simulate UUID for favoriteId
  const favoriteIdOwnedByCustomer1 = typia.random<
    string & tags.Format<"uuid">
  >();
  // We assume that the favorite ID exists and belongs to customer 1.
  // This is a precondition for the successful delete test.
  // Execute Test Scenario 1: Customer 1 deletes their own favorite
  await api.functional.shoppingMall.customer.sales.favorites.erase(
    customer1Connection,
    {
      favoriteId: favoriteIdOwnedByCustomer1,
    },
  );
  // No response to assert since void, but no error means success
  // Test Scenario 2: Customer 1 attempts to delete a non-existent favoriteId
  const nonExistentFavoriteId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "delete non-existent favorite returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.customer.sales.favorites.erase(
        customer1Connection,
        {
          favoriteId: nonExistentFavoriteId,
        },
      );
    },
  );
  // Test Scenario 3: Customer 2 attempts to delete favorite owned by Customer 1
  await TestValidator.httpError(
    "delete favorite not owned returns 403",
    403,
    async () => {
      await api.functional.shoppingMall.customer.sales.favorites.erase(
        customer2Connection,
        {
          favoriteId: favoriteIdOwnedByCustomer1,
        },
      );
    },
  );
}
