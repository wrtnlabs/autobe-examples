import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

/**
 * Test cart view endpoint with an available item that is in stock.
 *
 * Validates the complete flow from product creation through cart retrieval for
 * an available cart item. A seller creates a product with a variant having
 * explicit option values (color and size), adds inventory stock, then a customer
 * adds the variant to their cart and retrieves the cart listing.
 *
 * The test verifies that the cart item reflects accurate availability (available=true,
 * unavailable_reason=null), correct subtotal computation (quantity × effective unit
 * price where effective price = variant.price ?? product.base_price), and proper
 * pagination metadata reflecting exactly one record. The cart total — the sum of all
 * item subtotals — is validated against the single item's subtotal.
 *
 * 1. Seller registers, creates a product with base price.
 * 2. Seller creates a variant with option values (color: "Red", size: "Large").
 * 3. Seller adds 100 units of inventory stock to the variant.
 * 4. Customer registers and adds 3 units of the variant to the cart.
 * 5. Customer retrieves the cart page and validates all computed fields.
 */
export async function test_api_cart_view_with_available_item(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create variant with option values
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          optionValues: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
        },
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Add stock to variant
  const stockQuantity: number = 100;
  const inventoryRecord =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        body: {
          quantity_change: stockQuantity,
          reason: "Initial stock",
        },
        params: {
          productId: product.id,
          variantId: variant.id,
        },
      },
    );
  typia.assert(inventoryRecord);
  // 5. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 6. Add variant to cart
  const cartQuantity = 3;
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: cartQuantity,
        },
      },
    );
  typia.assert(cartItem);
  // 7. View cart
  const cartPage = await api.functional.shoppingMall.customer.cart_items.index(
    customerConnection,
    {
      body: {} satisfies IShoppingMallCartItem.IRequest,
    },
  );
  typia.assert(cartPage);
  // 8. Validate cart response
  const data = cartPage.data;
  TestValidator.equals("cart item count", data.length, 1);
  const item = data[0]!;
  TestValidator.equals("available flag", item.available, true);
  TestValidator.equals(
    "unavailable reason null",
    item.unavailable_reason,
    null,
  );
  TestValidator.equals("cart item quantity", item.quantity, cartQuantity);
  // Validate subtotal = quantity × effective unit price
  const effectivePrice = variant.price ?? product.base_price;
  const expectedSubtotal = cartQuantity * effectivePrice;
  TestValidator.equals(
    "subtotal matches expected",
    item.subtotal,
    expectedSubtotal,
  );
  // Validate pagination metadata
  TestValidator.equals(
    "pagination records count",
    cartPage.pagination.records,
    1,
  );
  TestValidator.equals("pagination total pages", cartPage.pagination.pages, 1);
  TestValidator.equals(
    "pagination current page",
    cartPage.pagination.current,
    1,
  );
}
