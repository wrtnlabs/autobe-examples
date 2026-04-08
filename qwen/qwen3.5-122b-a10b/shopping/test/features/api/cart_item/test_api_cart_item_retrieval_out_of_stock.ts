import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_customer_carts_items_create } from "../../../generate/generate_random_ecommerce_customer_carts_items_create";
import { prepare_random_ecommerce_cart_item } from "../../../prepare/prepare_random_ecommerce_cart_item";

export async function test_api_cart_item_retrieval_out_of_stock(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registers and authenticates
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create a cart item with product variant
  // Note: In simulation mode, this will generate valid random data
  // For real testing, the variant must exist with inventory records
  const cartId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const cartItem = await generate_random_ecommerce_customer_carts_items_create(
    customerConnection,
    {
      params: { cartId },
      body: {
        ecommerce_product_variant_id: variantId,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      } satisfies IEcommerceCartItem.ICreate,
    },
  );
  typia.assert(cartItem);
  // 3. Retrieve the specific cart item
  const retrievedCartItem =
    await api.functional.ecommerce.customer.carts.items.at(customerConnection, {
      cartId,
      itemId: cartItem.id,
    });
  typia.assert(retrievedCartItem);
  // 4. Validate cart item structure and content
  TestValidator.equals(
    "cart item ID matches",
    retrievedCartItem.id,
    cartItem.id,
  );
  TestValidator.equals(
    "quantity preserved",
    retrievedCartItem.quantity,
    cartItem.quantity,
  );
  TestValidator.predicate(
    "has product variant",
    retrievedCartItem.productVariant !== undefined,
  );
  TestValidator.predicate(
    "has availability status",
    typeof retrievedCartItem.availabilityStatus === "boolean",
  );
  TestValidator.predicate(
    "has created timestamp",
    retrievedCartItem.createdAt !== undefined,
  );
  TestValidator.predicate(
    "has updated timestamp",
    retrievedCartItem.updatedAt !== undefined,
  );
  TestValidator.predicate(
    "deletedAt is null for active item",
    retrievedCartItem.deletedAt === null,
  );
  // 5. Validate product variant summary structure
  TestValidator.predicate(
    "variant has ID",
    retrievedCartItem.productVariant.id !== undefined,
  );
  TestValidator.predicate(
    "variant has SKU code",
    retrievedCartItem.productVariant.sku_code !== undefined,
  );
  TestValidator.predicate(
    "variant has option values",
    retrievedCartItem.productVariant.option_values !== undefined,
  );
  TestValidator.predicate(
    "variant has stock count",
    typeof retrievedCartItem.productVariant.stock_count === "number",
  );
  TestValidator.predicate(
    "variant has parent product",
    retrievedCartItem.productVariant.product !== undefined,
  );
  TestValidator.predicate(
    "variant has created timestamp",
    retrievedCartItem.productVariant.created_at !== undefined,
  );
  TestValidator.predicate(
    "variant has updated timestamp",
    retrievedCartItem.productVariant.updated_at !== undefined,
  );
  // 6. Validate parent product summary structure
  TestValidator.predicate(
    "product has ID",
    retrievedCartItem.productVariant.product.id !== undefined,
  );
  TestValidator.predicate(
    "product has name",
    retrievedCartItem.productVariant.product.name !== undefined,
  );
  TestValidator.predicate(
    "product has base price",
    typeof retrievedCartItem.productVariant.product.base_price === "number",
  );
  TestValidator.predicate(
    "product has seller",
    retrievedCartItem.productVariant.product.seller !== undefined,
  );
  TestValidator.predicate(
    "product has category",
    retrievedCartItem.productVariant.product.category !== undefined,
  );
  TestValidator.predicate(
    "product has created timestamp",
    retrievedCartItem.productVariant.product.created_at !== undefined,
  );
  TestValidator.predicate(
    "product has updated timestamp",
    retrievedCartItem.productVariant.product.updated_at !== undefined,
  );
  // 7. Validate availability status computation
  // The availabilityStatus reflects real-time stock computation from inventory records
  // When stock_count > 0, availabilityStatus should be true
  // When stock_count = 0, availabilityStatus should be false (out of stock scenario)
  TestValidator.predicate(
    "availability status matches stock count",
    retrievedCartItem.availabilityStatus ===
      retrievedCartItem.productVariant.stock_count > 0,
  );
}
