import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventoryRecord";
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
import { generate_random_ecommerce_seller_variants_inventory_create } from "../../../generate/generate_random_ecommerce_seller_variants_inventory_create";
import { prepare_random_ecommerce_cart_item } from "../../../prepare/prepare_random_ecommerce_cart_item";
import { prepare_random_ecommerce_inventory_record } from "../../../prepare/prepare_random_ecommerce_inventory_record";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

export async function test_api_cart_item_quantity_update_out_of_stock(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
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
  // 2. Register and authenticate customer
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
  // 3. Create a product with a variant
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        variants: [
          {
            sku_code: `SKU-${RandomGenerator.alphabets(5)}`,
            option_values: `color=${RandomGenerator.alphabets(3)};size=${RandomGenerator.alphabets(3)}`,
          },
        ],
      },
    },
  );
  typia.assert(product);
  // Get the first variant
  const variant = product.variants[0];
  typia.assert(variant);
  // 4. Add initial inventory to the variant
  await generate_random_ecommerce_seller_variants_inventory_create(
    sellerConnection,
    {
      params: { variantId: variant.id },
      body: {
        quantity_change: 10,
        reason: "restock",
      } satisfies IEcommerceInventoryRecord.ICreate,
    },
  );
  // 5. Add the variant to customer's cart
  const cartItem = await generate_random_ecommerce_customer_carts_items_create(
    customerConnection,
    {
      params: { cartId: customer.id },
      body: {
        ecommerce_product_variant_id: variant.id,
        quantity: 2,
      } satisfies IEcommerceCartItem.ICreate,
    },
  );
  typia.assert(cartItem);
  // 6. Deplete the variant's inventory to zero
  await generate_random_ecommerce_seller_variants_inventory_create(
    sellerConnection,
    {
      params: { variantId: variant.id },
      body: {
        quantity_change: -10,
        reason: "inventory adjustment",
      } satisfies IEcommerceInventoryRecord.ICreate,
    },
  );
  // 7. Attempt to update the cart item quantity - should fail
  await TestValidator.error(
    "cart item quantity update should fail when out of stock",
    async () => {
      await api.functional.ecommerce.customer.carts.items.putByCartidAndItemid(
        customerConnection,
        {
          cartId: customer.id,
          itemId: cartItem.id,
          body: {
            quantity: 3,
          } satisfies IEcommerceCartItem.IUpdate,
        },
      );
    },
  );
}
