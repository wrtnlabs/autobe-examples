import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test retrieval of a specific product rating by its unique identifier.
 *
 * 1. Register a new customer (join), authenticating as that customer.
 * 2. Create a new product rating as the authenticated customer. (Since the
 *    referenced product/order/skus must exist to create a rating, use
 *    typia.random to produce valid/consistent dummy values for those reference
 *    fields.)
 * 3. Retrieve the created product rating using its ID with the public endpoint (no
 *    authentication required on this endpoint).
 * 4. Assert that the retrieved rating matches the details of the rating created in
 *    step 2.
 * 5. (If deletion flow supported) Simulate rating deletion and confirm retrieval
 *    is not possible. (Skipped unless endpoint for deletion is present.)
 */
export async function test_api_product_rating_retrieve_by_id(
  connection: api.IConnection,
) {
  // 1. Register a customer
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.Format<"password">
      >(),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // 2. Create a product rating as this customer
  // (References are randomized but required structure is satisfied)
  const ratingInput = {
    shopping_mall_product_sku_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_order_item_id: typia.random<string & tags.Format<"uuid">>(),
    value: RandomGenerator.pick([1, 2, 3, 4, 5]) satisfies number as number,
  } satisfies IShoppingMallProductRating.ICreate;
  const createdRating =
    await api.functional.shoppingMall.customer.productRatings.create(
      connection,
      {
        body: ratingInput,
      },
    );
  typia.assert(createdRating);

  // 3. Retrieve the product rating by its ID
  const retrievedRating = await api.functional.shoppingMall.productRatings.at(
    connection,
    {
      productRatingId: createdRating.id,
    },
  );
  typia.assert(retrievedRating);

  // 4. Assertions: the retrieved rating should equal the created rating
  TestValidator.equals(
    "retrieved rating should match created rating (by id)",
    retrievedRating.id,
    createdRating.id,
  );
  TestValidator.equals(
    "retrieved rating must have the same value property",
    retrievedRating.value,
    createdRating.value,
  );
  TestValidator.equals(
    "retrieved rating must not be soft-deleted",
    retrievedRating.deleted_at,
    null,
  );

  // Cross-check major reference properties for presence and matching types
  typia.assert<IShoppingMallProductRating>(retrievedRating);
}
