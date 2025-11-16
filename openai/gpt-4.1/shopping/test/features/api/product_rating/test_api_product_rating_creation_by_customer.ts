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
 * Test customer product rating creation workflow.
 *
 * 1. Register a new customer via the join endpoint.
 * 2. Compose a fake product SKU, order, and order item UUIDs for rating creation.
 * 3. Attempt to create a new product rating for those IDs with a valid value.
 * 4. Validate the rating and audit fields, including value and customer trace.
 * 5. Attempt to create duplicate rating for same (customer, sku, order item) and
 *    expect error.
 */
export async function test_api_product_rating_creation_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a fresh customer
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Prepare fake product SKU, order, and order item UUIDs (no real product/order APIs exposed in this context)
  const productSkuId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const orderItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const ratingValue: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5> = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();

  // 3. Create the product rating
  const createBody = {
    shopping_mall_product_sku_id: productSkuId,
    shopping_mall_order_id: orderId,
    shopping_mall_order_item_id: orderItemId,
    value: ratingValue,
  } satisfies IShoppingMallProductRating.ICreate;

  const rating: IShoppingMallProductRating =
    await api.functional.shoppingMall.customer.productRatings.create(
      connection,
      { body: createBody },
    );
  typia.assert(rating);
  TestValidator.equals(
    "product SKU id recorded in rating",
    rating.shopping_mall_product_sku_id,
    productSkuId,
  );
  TestValidator.equals(
    "order id recorded in rating",
    rating.shopping_mall_order_id,
    orderId,
  );
  TestValidator.equals(
    "order item id recorded in rating",
    rating.shopping_mall_order_item_id,
    orderItemId,
  );
  TestValidator.equals("rating value stored", rating.value, ratingValue);
  TestValidator.predicate(
    "audit fields created_at present",
    typeof rating.created_at === "string" && rating.created_at.length > 0,
  );
  TestValidator.predicate(
    "audit fields updated_at present",
    typeof rating.updated_at === "string" && rating.updated_at.length > 0,
  );
  TestValidator.predicate(
    "customer id linked to rating",
    rating.shopping_mall_customer_id === customer.id,
  );
  TestValidator.predicate("rating not soft deleted", !rating.deleted_at);

  // 4. Attempt to create a duplicate rating with the same keys and expect an error
  await TestValidator.error(
    "duplicate product rating for same (customer, sku, order item) must fail",
    async () => {
      await api.functional.shoppingMall.customer.productRatings.create(
        connection,
        { body: createBody },
      );
    },
  );
}
