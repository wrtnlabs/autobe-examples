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
 * Test cart view behavior when a referenced variant is soft-deleted by the seller.
 *
 * Validates that after a seller removes a variant that was previously added to a
 * customer's cart, the cart item persists in the listing but is flagged as
 * unavailable with the reason "variant_deleted". Confirms that the item's identity —
 * product name, variant options, unit price, quantity, and computed subtotal —
 * remains intact and that the deletion check has highest priority over stock-based
 * availability checks.
 *
 * 1. Seller registers, creates a product with a variant, and adds initial stock
 *    to make the variant purchasable.
 * 2. Customer registers and adds the variant to their shopping cart.
 * 3. Seller soft-deletes the variant so it no longer appears in active listings.
 * 4. Customer views the cart: item appears with available=false and
 *    unavailable_reason="variant_deleted".
 * 5. Validates that the cart item still retains its variant details, quantity,
 *    and subtotal, confirming the item is preserved for customer visibility
 *    rather than being removed from the cart.
 */
export async function test_api_cart_view_variant_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup: register, create product, variant, and add stock
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      body: { quantity_change: 100 },
      params: { productId: product.id, variantId: variant.id },
    },
  );
  // 2. Customer setup: register and add variant to cart
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: { productVariantId: variant.id },
      },
    );
  typia.assert(cartItem);
  // 3. Seller soft-deletes the variant
  await api.functional.shoppingMall.seller.products.variants.erase(
    sellerConnection,
    {
      productId: product.id,
      variantId: variant.id,
    },
  );
  // 4. Customer views the cart
  const cartPage = await api.functional.shoppingMall.customer.cart_items.index(
    customerConnection,
    {
      body: {
        limit: 10,
      } satisfies IShoppingMallCartItem.IRequest,
    },
  );
  typia.assert(cartPage);
  // 5. Validate the cart item is present with "variant_deleted" reason
  TestValidator.predicate(
    "cart should have at least one item",
    cartPage.data.length >= 1,
  );
  const viewedItem = cartPage.data[0];
  TestValidator.equals("cart item id matches", viewedItem.id, cartItem.id);
  TestValidator.equals(
    "cart item should be unavailable",
    viewedItem.available,
    false,
  );
  TestValidator.equals(
    "unavailable reason should be variant_deleted",
    viewedItem.unavailable_reason,
    "variant_deleted",
  );
  TestValidator.equals(
    "quantity should be preserved",
    viewedItem.quantity,
    cartItem.quantity,
  );
  TestValidator.predicate(
    "subtotal should be positive",
    viewedItem.subtotal > 0,
  );
  TestValidator.equals(
    "variant code should be preserved",
    viewedItem.productVariant.code,
    variant.code,
  );
}
