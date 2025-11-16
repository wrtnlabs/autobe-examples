import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test erasure (soft deletion) of an order item by an authenticated seller.
 *
 * 1. Register a new seller account using /auth/seller/join and authenticate (token
 *    is set automatically)
 * 2. Simulate the existence of a target orderNumber and orderItemId for erasure
 * 3. Call the erase endpoint
 *    /shoppingMall/seller/orders/{orderNumber}/items/{orderItemId} as the
 *    seller
 * 4. Assert: the returned IShoppingMallOrderItem has deleted_at set (not
 *    null/undefined)
 *
 *    - The parent order summary is present
 *    - The erased item has correct id and orderNumber
 *
 * Note: No creation APIs available for orders or items; test uses random
 * identifiers to focus on erasure API business logic.
 */
export async function test_api_order_item_erasure_by_seller(
  connection: api.IConnection,
) {
  // 1. Register a new seller and authenticate (token is set on connection)
  const registrationInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    business_name: RandomGenerator.name(2),
    registration_number: RandomGenerator.alphaNumeric(10),
    business_phone: RandomGenerator.mobile(),
    href: "https://sellerportal.example.com/dashboard",
    referrer: "https://sellerportal.example.com/join",
    ip: undefined,
  } satisfies IShoppingMallSeller.ICreate;
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: registrationInput,
    });
  typia.assert(sellerAuth);

  // 2. Simulate orderNumber and orderItemId for erasure (use typia.random for valid types)
  const orderNumber: string = RandomGenerator.alphaNumeric(12); // Mimic an order number
  const orderItemId = typia.random<string & tags.Format<"uuid">>();

  // 3. Execute the erase API
  const erasedItem: IShoppingMallOrderItem =
    await api.functional.shoppingMall.seller.orders.items.erase(connection, {
      orderNumber,
      orderItemId,
    });
  typia.assert(erasedItem);

  // 4. Validate the core post-conditions
  TestValidator.predicate(
    "deleted_at must be set",
    erasedItem.deleted_at !== null && erasedItem.deleted_at !== undefined,
  );
  TestValidator.predicate(
    "parent order summary is present",
    erasedItem.order !== null && erasedItem.order !== undefined,
  );
  TestValidator.equals(
    "order item id matches requested",
    erasedItem.id,
    orderItemId,
  );
  TestValidator.equals(
    "order summary order_number matches requested",
    erasedItem.order.order_number,
    orderNumber,
  );
}
