import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerWarehouse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerWarehouse";

export async function test_api_seller_warehouse_delete_handles_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. Seller joins the platform and becomes authenticated
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert(sellerAuthorized);

  // 2. Create a legitimate warehouse for this seller
  const createWarehouseBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_default_origin: true,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const existingWarehouse: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: createWarehouseBody,
      },
    );
  typia.assert(existingWarehouse);

  // 3. Generate a random UUID that does NOT match the existing warehouse id
  let nonexistentWarehouseId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (nonexistentWarehouseId === existingWarehouse.id) {
    // Extremely unlikely, but just to be safe regenerate once
    nonexistentWarehouseId = typia.random<string & tags.Format<"uuid">>();
  }

  // 4. Attempt to delete the non-existent warehouse and expect a 404-style HTTP error
  await TestValidator.httpError(
    "deleting a non-existent warehouse must return 404",
    404,
    async () => {
      await api.functional.shoppingMall.seller.sellerWarehouses.erase(
        connection,
        {
          warehouseId: nonexistentWarehouseId,
        },
      );
    },
  );
}
