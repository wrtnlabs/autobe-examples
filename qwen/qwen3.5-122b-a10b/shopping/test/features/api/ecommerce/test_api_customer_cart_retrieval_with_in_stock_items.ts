import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCart";
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

export async function test_api_customer_cart_retrieval_with_in_stock_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Retrieve cart with validation options enabled
  const cart = await api.functional.ecommerce.customer.carts.search(
    customerConnection,
    {
      body: {
        include_details: true,
        validate_stock: true,
        validate_availability: true,
      } satisfies IEcommerceCart.IRequest,
    },
  );
  typia.assert(cart);
  // 3. Validate cart structure and computed fields
  TestValidator.equals(
    "item_count matches items array length",
    cart.item_count,
    cart.items.length,
  );
  TestValidator.predicate(
    "total_amount is non-negative",
    cart.total_amount >= 0,
  );
  TestValidator.predicate(
    "unavailable_count is non-negative",
    cart.unavailable_count >= 0,
  );
  TestValidator.predicate(
    "unavailable_count does not exceed item_count",
    cart.unavailable_count <= cart.item_count,
  );
  // 4. Validate cart items if present
  if (cart.items.length > 0) {
    for (const item of cart.items) {
      // Validate cart item basic structure
      TestValidator.predicate(
        "cart item has positive quantity",
        item.quantity >= 1,
      );
      TestValidator.predicate(
        "cart item has availabilityStatus",
        typeof item.availabilityStatus === "boolean",
      );
      // Validate product variant details
      TestValidator.predicate(
        "variant has sku_code",
        item.productVariant.sku_code.length > 0,
      );
      TestValidator.predicate(
        "variant has option_values",
        item.productVariant.option_values.length > 0,
      );
      TestValidator.predicate(
        "variant has non-negative stock_count",
        item.productVariant.stock_count >= 0,
      );
      // Validate variant price (optional field)
      if (
        item.productVariant.price !== null &&
        item.productVariant.price !== undefined
      ) {
        TestValidator.predicate(
          "variant price is positive",
          item.productVariant.price > 0,
        );
      }
      // Validate product reference in variant
      TestValidator.predicate(
        "product has name",
        item.productVariant.product.name.length > 0,
      );
      TestValidator.predicate(
        "product has base_price",
        item.productVariant.product.base_price > 0,
      );
      // Validate seller reference
      TestValidator.predicate(
        "seller has shop_name",
        item.productVariant.product.seller.shop_name.length > 0,
      );
      // Validate category reference
      TestValidator.predicate(
        "category has name",
        item.productVariant.product.category.name.length > 0,
      );
    }
  }
  // 5. Validate cart timestamps exist
  TestValidator.predicate(
    "cart has created_at",
    cart.created_at !== null && cart.created_at !== undefined,
  );
  TestValidator.predicate(
    "cart has updated_at",
    cart.updated_at !== null && cart.updated_at !== undefined,
  );
}
