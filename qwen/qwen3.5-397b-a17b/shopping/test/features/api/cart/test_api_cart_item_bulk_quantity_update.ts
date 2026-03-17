import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

/**
 * Test the bulk cart item quantity update workflow for a customer with multiple items in their cart.
 *
 * This test verifies that customers can efficiently update quantities of multiple cart items
 * in a single request, with proper validation against stock availability and accurate
 * recalculation of cart totals.
 *
 * Preconditions:
 * - Customer account is registered and authenticated
 * - Customer's cart contains at least 2 different product variants with sufficient stock
 *
 * Test Steps:
 * 1. Seller creates a product with multiple variants
 * 2. Customer adds first product variant to cart with quantity 1
 * 3. Customer adds second product variant to cart with quantity 1
 * 4. Customer retrieves cart to get the cart item IDs
 * 5. Customer submits bulk update request with new quantities (e.g., first item quantity=3, second item quantity=5)
 * 6. System validates quantities against available stock for each variant
 * 7. System updates quantities and recalculates cart totals
 *
 * Validation Points:
 * - Both cart item quantities are updated to the requested values
 * - Cart subtotal for each item is correctly recalculated (unit price × new quantity)
 * - Cart total price is the sum of all item subtotals
 * - updated_at timestamps are updated for modified items
 * - Response includes complete cart state with all items
 * - No duplicate cart items are created
 *
 * Business Logic Verified:
 * - Bulk update efficiently modifies multiple items in single request
 * - Quantity updates respect stock availability
 * - Cart totals are accurately recalculated after updates
 */
export async function test_api_cart_item_bulk_quantity_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - create seller account and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  const sellerLogin = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoin.email,
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerLogin);
  // 2. Create product
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create first variant with sufficient stock
  const variant1 =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          stock_quantity: 100,
          options: [
            {
              key: "color",
              value: "Red",
            },
          ],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant1);
  // 4. Create second variant with sufficient stock
  const variant2 =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          stock_quantity: 100,
          options: [
            {
              key: "color",
              value: "Blue",
            },
          ],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant2);
  // 5. Customer setup - create customer account and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);
  const customerLogin = await authorize_customer_login(customerConnection, {
    body: {
      email: customerJoin.email,
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(customerLogin);
  // 6. Add first variant to cart with quantity 1
  const cartItem1 =
    await api.functional.shoppingMall.customer.customers.cart.items.create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant1.id,
          quantity: 1,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem1);
  // 7. Add second variant to cart with quantity 1
  const cartItem2 =
    await api.functional.shoppingMall.customer.customers.cart.items.create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant2.id,
          quantity: 1,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem2);
  // 8. Submit bulk update request with new quantities
  // Note: IBulkUpdate.updates contains IUpdate objects which only have quantity field
  // The API identifies items to update by their position in the cart
  const newQuantity1 = 3;
  const newQuantity2 = 5;
  const updatedCart =
    await api.functional.shoppingMall.customer.customers.cart.items.updateBulk(
      customerConnection,
      {
        body: {
          updates: [
            {
              quantity: newQuantity1,
            },
            {
              quantity: newQuantity2,
            },
          ],
        } satisfies IShoppingMallCartItem.IBulkUpdate,
      },
    );
  typia.assert(updatedCart);
  // 9. Validate bulk update results
  TestValidator.equals("cart should have 2 items", updatedCart.items.length, 2);
  // Find updated items in cart by variant ID
  const updatedItem1 = updatedCart.items.find(
    (item) => item.variant.id === variant1.id,
  );
  const updatedItem2 = updatedCart.items.find(
    (item) => item.variant.id === variant2.id,
  );
  TestValidator.predicate(
    "first item should exist",
    updatedItem1 !== undefined,
  );
  TestValidator.predicate(
    "second item should exist",
    updatedItem2 !== undefined,
  );
  // Validate quantities are updated correctly
  TestValidator.equals(
    "first item quantity updated",
    updatedItem1!.quantity,
    newQuantity1,
  );
  TestValidator.equals(
    "second item quantity updated",
    updatedItem2!.quantity,
    newQuantity2,
  );
  // Validate subtotals are recalculated correctly
  const unitPrice1 = variant1.price ?? product.base_price;
  const unitPrice2 = variant2.price ?? product.base_price;
  const expectedSubtotal1 = unitPrice1 * newQuantity1;
  const expectedSubtotal2 = unitPrice2 * newQuantity2;
  TestValidator.equals(
    "first item subtotal recalculated",
    updatedItem1!.subtotal,
    expectedSubtotal1,
  );
  TestValidator.equals(
    "second item subtotal recalculated",
    updatedItem2!.subtotal,
    expectedSubtotal2,
  );
  // Validate total price is sum of subtotals
  const expectedTotal = expectedSubtotal1 + expectedSubtotal2;
  TestValidator.equals(
    "cart total price correct",
    updatedCart.totalPrice,
    expectedTotal,
  );
  // Validate timestamps are updated
  TestValidator.predicate(
    "first item updated_at is recent",
    updatedItem1!.updatedAt > cartItem1.createdAt,
  );
  TestValidator.predicate(
    "second item updated_at is recent",
    updatedItem2!.updatedAt > cartItem2.createdAt,
  );
  // Validate no duplicate items created
  const itemIds = updatedCart.items.map((item) => item.id);
  TestValidator.equals(
    "no duplicate items",
    itemIds.length,
    new Set(itemIds).size,
  );
  // Validate items are still available
  TestValidator.predicate("first item is available", updatedItem1!.available);
  TestValidator.predicate("second item is available", updatedItem2!.available);
  // Validate stock warnings are false (quantities well within stock limits)
  TestValidator.predicate(
    "first item has no stock warning",
    !updatedItem1!.stockWarning,
  );
  TestValidator.predicate(
    "second item has no stock warning",
    !updatedItem2!.stockWarning,
  );
}
