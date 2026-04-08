import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_customer_carts_items_create } from "../../../generate/generate_random_ecommerce_customer_carts_items_create";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_seller_products_variants_create";
import { prepare_random_ecommerce_cart_item } from "../../../prepare/prepare_random_ecommerce_cart_item";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

/**
 * Test cart item removal by setting quantity to zero.
 *
 * Validates that a customer can remove items from their shopping cart by updating the quantity to zero, which triggers a soft-delete operation. The cart item record is preserved with a deleted_at timestamp for audit purposes while being excluded from active cart views.
 *
 * This test ensures the cart item removal workflow functions correctly through quantity updates, maintaining data integrity while allowing customers to manage their shopping carts effectively.
 *
 * 1. Seller registers and authenticates to create products.
 * 2. Seller creates a product with a variant for cart operations.
 * 3. Customer registers and authenticates to access cart features.
 * 4. Customer adds the product variant to their shopping cart.
 * 5. Customer updates the cart item quantity to zero.
 * 6. Verifies the cart item has deleted_at timestamp set (soft-deleted).
 * 7. Verifies the cart item still exists in the database (not hard deleted).
 */
export async function test_api_cart_item_quantity_remove_via_zero(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Create product with variant
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          sku_code: RandomGenerator.alphabets(8).toUpperCase(),
          option_values: `color=${RandomGenerator.name(1)};size=${RandomGenerator.name(1)}`,
        } satisfies IEcommerceProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 3. Customer setup - register and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // Generate cart ID for the customer
  const cartId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Add variant to cart
  const cartItem = await generate_random_ecommerce_customer_carts_items_create(
    customerConnection,
    {
      params: {
        cartId,
      },
      body: {
        ecommerce_product_variant_id: variant.id,
        quantity: 2,
      } satisfies IEcommerceCartItem.ICreate,
    },
  );
  typia.assert(cartItem);
  // Verify cart item was created with positive quantity
  TestValidator.equals(
    "cart item quantity before removal",
    cartItem.quantity,
    2,
  );
  TestValidator.predicate(
    "cart item not deleted before removal",
    cartItem.deletedAt === null,
  );
  // 5. Update cart item quantity to zero (soft-delete)
  const updatedCartItem =
    await api.functional.ecommerce.customer.carts.items.patchByCartid(
      customerConnection,
      {
        cartId,
        body: {
          quantity: 0,
        } satisfies IEcommerceCartItem.IUpdate,
      },
    );
  typia.assert(updatedCartItem);
  // 6. Verify cart item is soft-deleted
  TestValidator.predicate(
    "cart item deleted_at is set after quantity zero",
    updatedCartItem.deleted_at !== null,
  );
  TestValidator.predicate(
    "cart item quantity is zero after update",
    updatedCartItem.quantity === 0,
  );
  // 7. Verify cart item still exists (soft-delete, not hard delete)
  TestValidator.predicate(
    "cart item id preserved after soft-delete",
    updatedCartItem.id === cartItem.id,
  );
}
