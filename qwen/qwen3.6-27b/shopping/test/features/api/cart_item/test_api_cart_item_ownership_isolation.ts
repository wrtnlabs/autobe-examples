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
 * Validates that a customer cannot modify another customer's shopping cart item through ownership isolation.
 *
 * Tests the critical security boundary where Customer B attempts to update Customer A's cart item. The system must reject this cross-ownership modification, ensuring each customer can only manage their own shopping cart contents.
 *
 * The test establishes the prerequisite product catalog infrastructure through admin and seller actors, creates a cart item owned by Customer A, and then attempts the unauthorized modification via Customer B.
 *
 * 1. Administrator joins and creates a product category for classification.
 * 2. Seller joins, creates a product under the category, and adds a product variant.
 * 3. Customer A joins and adds the product variant to their shopping cart.
 * 4. Customer B joins as a separate authenticated account.
 * 5. Customer B attempts to update the quantity of Customer A's cart item.
 * 6. The system rejects the modification request due to ownership mismatch.
 * 7. Validates that the error is thrown and Customer A's cart item remains unchanged.
 */
export async function test_api_cart_item_ownership_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and creates a product category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: {} });
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      { body: {} },
    );
  typia.assert(category);
  // 2. Seller joins, creates a product under the category, and adds a variant
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, { body: {} });
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      { body: { category_id: category.id } },
    );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      { body: {}, params: { productId: product.id } },
    );
  typia.assert(variant);
  // 3. Customer A joins and adds the product variant to their shopping cart
  const customerAConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerAConnection, { body: {} });
  const cartItem =
    await generate_random_ecommerce_platform_customer_cart_items_create(
      customerAConnection,
      { body: { product_variant_id: variant.id } },
    );
  typia.assert(cartItem);
  // Validate original cart item state
  const originalQuantity = cartItem.quantity;
  TestValidator.equals(
    "cart item contains correct product variant",
    cartItem.productVariant.id,
    variant.id,
  );
  // 4. Customer B joins as a separate authenticated account
  const customerBConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerBConnection, { body: {} });
  // 5. Customer B attempts to update Customer A's cart item - should fail
  const updateBody = {
    quantity: 2,
  } satisfies IEcommercePlatformShoppingCartItem.IUpdate;
  await TestValidator.error(
    "Customer B cannot update Customer A's cart item",
    async () => {
      await api.functional.ecommercePlatform.customer.cart_items.update(
        customerBConnection,
        {
          cartItemId: cartItem.id,
          body: updateBody,
        },
      );
    },
  );
  // 6. Validate Customer A's cart item remains unchanged
  TestValidator.equals(
    "Customer A cart item quantity unchanged",
    cartItem.quantity,
    originalQuantity,
  );
}
