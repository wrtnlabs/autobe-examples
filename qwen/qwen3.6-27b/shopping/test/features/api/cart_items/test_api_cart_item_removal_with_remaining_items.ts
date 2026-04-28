import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShoppingCartItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_platform_admin_categories_create } from "../../../generate/generate_random_ecommerce_platform_admin_categories_create";
import { generate_random_ecommerce_platform_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_platform_customer_cart_items_create";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";
import { prepare_random_ecommerce_platform_shopping_cart_item } from "../../../prepare/prepare_random_ecommerce_platform_shopping_cart_item";

/**
 * Test cart item removal with remaining items in the shopping cart.
 *
 * Validates that a customer can successfully remove one item from a cart containing multiple items,
 * where the removed item is permanently deleted from the cart and remaining items are unaffected.
 * Tests cart item deletion returns appropriate response and that erased items become inaccessible.
 *
 * 1. Administrator creates a product category for classification.
 * 2. Seller creates a product and two distinct variants under that category.
 * 3. Customer registers and adds both variants to their shopping cart.
 * 4. Customer removes one cart item (variant B) via the erase endpoint.
 * 5. Verify the erased cart item can no longer be accessed (404 error on attempted erase again).
 * 6. Verify the remaining cart item (variant A) is still present and unaffected.
 */
export async function test_api_cart_item_removal_with_remaining_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller setup - create product and variants
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      { body: { category_id: category.id } },
    );
  typia.assert(product);
  const variantA =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id }, body: {} },
    );
  typia.assert(variantA);
  const variantB =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id }, body: {} },
    );
  typia.assert(variantB);
  // 3. Customer setup - add both variants to cart
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const cartItemA =
    await generate_random_ecommerce_platform_customer_cart_items_create(
      customerConnection,
      { body: { product_variant_id: variantA.id, quantity: 1 } },
    );
  typia.assert(cartItemA);
  const cartItemB =
    await generate_random_ecommerce_platform_customer_cart_items_create(
      customerConnection,
      { body: { product_variant_id: variantB.id, quantity: 1 } },
    );
  typia.assert(cartItemB);
  // 4. Remove cart item B
  await api.functional.ecommercePlatform.customer.cart_items.erase(
    customerConnection,
    { cartItemId: cartItemB.id },
  );
  // 5. Verify erased item returns 404 (cannot access deleted item)
  await TestValidator.httpError("erased cart item returns 404", 404, async () =>
    api.functional.ecommercePlatform.customer.cart_items.erase(
      customerConnection,
      { cartItemId: cartItemB.id },
    ),
  );
  // 6. Verify remaining item is unaffected (can still be erased successfully)
  await api.functional.ecommercePlatform.customer.cart_items.erase(
    customerConnection,
    { cartItemId: cartItemA.id },
  );
}
