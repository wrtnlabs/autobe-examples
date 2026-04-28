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
 * Verifies system returns 404 when updating a non-existent shopping cart item.
 *
 * Sets up a complete product and cart workflow through multiple actor authentication: admin creates a product category, seller creates a product with variant under that category, and customer adds the variant to their shopping cart. Then the customer attempts to update a random non-existent cart item ID.
 *
 * The cart item update endpoint specification states: "if the cart item was soft-deleted (deleted_at is not null), return 404 not found" and "Reject with 403/404 if ownership validation fails." This test validates the 404 Not Found response is correctly returned when the target cart item does not exist, preserving API contract for missing resources.
 *
 * 1. Administrator logs in and creates a product category.
 * 2. Seller logs in and creates a product under the category.
 * 3. Seller creates a variant for the product.
 * 4. Customer logs in and adds the product variant to cart.
 * 5. Customer attempts to update a non-existent cart item ID.
 * 6. System rejects with 404 Not Found.
 */
export async function test_api_cart_item_soft_deleted_not_found(
  connection: api.IConnection,
) {
  // 1. Administrator authentication and category creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: typia.random<IEcommercePlatformAdmin.ILogin>(),
  });
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller authentication and product creation
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: typia.random<IEcommercePlatformSeller.ILogin>(),
  });
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: { category_id: category.id },
      },
    );
  typia.assert(product);
  // 3. Seller creates product variant
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  // 4. Customer authentication and cart item creation
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConnection, {
    body: typia.random<IEcommercePlatformCustomer.ILogin>(),
  });
  const cartItem =
    await generate_random_ecommerce_platform_customer_cart_items_create(
      customerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: 1,
        } satisfies IEcommercePlatformShoppingCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 5. Generate a random non-existent cart item ID
  const nonExistentCartItemId = typia.random<string & tags.Format<"uuid">>();
  // 6. Prepare update body
  const updateBody = {
    quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number as number,
  } satisfies IEcommercePlatformShoppingCartItem.IUpdate;
  // 7. System should reject with 404 Not Found for non-existent cart item
  await TestValidator.httpError(
    "update non-existent cart item returns 404 not found",
    404,
    async () => {
      await api.functional.ecommercePlatform.customer.cart_items.update(
        customerConnection,
        {
          cartItemId: nonExistentCartItemId,
          body: updateBody,
        },
      );
    },
  );
}
