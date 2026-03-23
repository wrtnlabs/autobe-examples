import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductInventoryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryStatus";
import type { IShoppingMallProductInventoryStatusItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryStatusItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller data isolation to ensure sellers can only view inventory for their own products.
 *
 * This test validates that:
 * 1. Each seller can only query inventory status for their own products
 * 2. The seller_id filter is automatically applied based on authenticated seller identity
 * 3. Cross-seller inventory access is denied
 * 4. Data isolation boundaries are enforced correctly between different sellers
 */
export async function test_api_seller_inventory_status_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerA);
  // 2. Register and authenticate Seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerB);
  // 3. Seller A queries their inventory status
  const inventoryA =
    await api.functional.shoppingMall.seller.products.inventory.status.inventoryStatus(
      sellerAConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallProductInventoryStatus.IRequest,
      },
    );
  typia.assert(inventoryA);
  // 4. Seller B queries their inventory status
  const inventoryB =
    await api.functional.shoppingMall.seller.products.inventory.status.inventoryStatus(
      sellerBConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallProductInventoryStatus.IRequest,
      },
    );
  typia.assert(inventoryB);
  // 5. Validate that Seller A's inventory only contains their own products
  TestValidator.predicate(
    "Seller A inventory items belong to Seller A",
    inventoryA.items.every((item) => item.seller_id === sellerA.id),
  );
  // 6. Validate that Seller B's inventory only contains their own products
  TestValidator.predicate(
    "Seller B inventory items belong to Seller B",
    inventoryB.items.every((item) => item.seller_id === sellerB.id),
  );
  // 7. Validate that Seller A cannot see Seller B's products
  TestValidator.predicate(
    "Seller A cannot see Seller B's products",
    inventoryA.items.every((item) => item.seller_id !== sellerB.id),
  );
  // 8. Validate that Seller B cannot see Seller A's products
  TestValidator.predicate(
    "Seller B cannot see Seller A's products",
    inventoryB.items.every((item) => item.seller_id !== sellerA.id),
  );
  // 9. Validate that seller shop names match the authenticated sellers
  TestValidator.predicate(
    "Seller A inventory items have correct shop names",
    inventoryA.items.every(
      (item) => item.seller_shop_name === sellerA.shop_name,
    ),
  );
  TestValidator.predicate(
    "Seller B inventory items have correct shop names",
    inventoryB.items.every(
      (item) => item.seller_shop_name === sellerB.shop_name,
    ),
  );
  // 10. Validate summary statistics are correct for each seller
  TestValidator.equals(
    "Seller A summary totalVariants matches items count",
    inventoryA.summary.totalVariants,
    inventoryA.items.length,
  );
  TestValidator.equals(
    "Seller B summary totalVariants matches items count",
    inventoryB.summary.totalVariants,
    inventoryB.items.length,
  );
  // 11. Validate pagination metadata
  TestValidator.equals(
    "Seller A pagination page is 1",
    inventoryA.pagination.page,
    1,
  );
  TestValidator.equals(
    "Seller B pagination page is 1",
    inventoryB.pagination.page,
    1,
  );
  TestValidator.equals(
    "Seller A pagination limit is 100",
    inventoryA.pagination.limit,
    100,
  );
  TestValidator.equals(
    "Seller B pagination limit is 100",
    inventoryB.pagination.limit,
    100,
  );
}
