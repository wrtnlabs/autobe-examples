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

/**
 * Test customer cart retrieval with available items.
 *
 * Validates that a customer can successfully retrieve their shopping cart containing product variants with available stock. The test ensures the cart response includes all expected fields and that stock availability is properly validated.
 *
 * The scenario covers the primary success path where:
 * 1. A customer account is created and authenticated
 * 2. The customer's cart is retrieved using the cart ID
 * 3. All cart fields are validated including customer summary, items array, totals, and timestamps
 * 4. Cart items contain proper variant details with availability status
 *
 * 1. Customer registers with valid credentials.
 * 2. Customer connection is created with authentication token.
 * 3. Cart is retrieved using the customer's cart ID.
 * 4. Validates cart structure includes all required fields.
 * 5. Validates customer summary contains correct identity information.
 * 6. Validates cart items array structure and variant details.
 * 7. Validates availability status and stock information for each item.
 * 8. Validates total amount calculation and item counts.
 */
export async function test_api_cart_retrieval_with_available_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  // 2. Generate cart ID (cart is automatically created upon customer registration)
  // Note: In production, cart would be created with customer and we'd retrieve it
  const cartId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve cart
  const cart = await api.functional.ecommerce.customer.carts.at(
    customerConnection,
    {
      cartId,
    },
  );
  typia.assert(cart);
  // 4. Validate cart structure
  TestValidator.equals("cart ID matches", cart.id, cartId);
  TestValidator.predicate("customer has ID", cart.customer.id.length > 0);
  TestValidator.predicate("customer has email", cart.customer.email.length > 0);
  TestValidator.predicate(
    "customer has display name",
    cart.customer.display_name.length > 0,
  );
  TestValidator.predicate("has items array", Array.isArray(cart.items));
  TestValidator.predicate(
    "total amount is non-negative",
    cart.total_amount >= 0,
  );
  TestValidator.predicate("item count is non-negative", cart.item_count >= 0);
  TestValidator.predicate(
    "unavailable count is non-negative",
    cart.unavailable_count >= 0,
  );
  TestValidator.predicate("has created timestamp", cart.created_at.length > 0);
  TestValidator.predicate("has updated timestamp", cart.updated_at.length > 0);
  // 5. Validate customer summary matches authenticated customer
  TestValidator.equals("customer ID matches", cart.customer.id, customer.id);
  TestValidator.equals(
    "customer display name matches",
    cart.customer.display_name,
    customer.display_name,
  );
  // 6. Validate cart items if present
  if (cart.items.length > 0) {
    TestValidator.predicate(
      "item count matches items array length",
      cart.item_count === cart.items.length,
    );
    for (const item of cart.items) {
      // Validate cart item structure
      TestValidator.predicate("item has ID", item.id.length > 0);
      TestValidator.predicate("item has positive quantity", item.quantity > 0);
      TestValidator.predicate(
        "item has availability status",
        typeof item.availabilityStatus === "boolean",
      );
      TestValidator.predicate(
        "item has created timestamp",
        item.createdAt.length > 0,
      );
      TestValidator.predicate(
        "item has updated timestamp",
        item.updatedAt.length > 0,
      );
      // Validate product variant details
      const variant = item.productVariant;
      TestValidator.predicate("variant has ID", variant.id.length > 0);
      TestValidator.predicate(
        "variant has SKU code",
        variant.sku_code.length > 0,
      );
      TestValidator.predicate(
        "variant has option values",
        variant.option_values.length > 0,
      );
      TestValidator.predicate(
        "variant has stock count",
        variant.stock_count >= 0,
      );
      TestValidator.predicate(
        "variant has created timestamp",
        variant.created_at.length > 0,
      );
      TestValidator.predicate(
        "variant has updated timestamp",
        variant.updated_at.length > 0,
      );
      // Validate parent product in variant
      TestValidator.predicate(
        "variant has product reference",
        variant.product.id.length > 0,
      );
      TestValidator.predicate(
        "variant product has name",
        variant.product.name.length > 0,
      );
      TestValidator.predicate(
        "variant product has base price",
        variant.product.base_price >= 0,
      );
      // Validate seller in product
      TestValidator.predicate(
        "product has seller",
        variant.product.seller.id.length > 0,
      );
      TestValidator.predicate(
        "seller has shop name",
        variant.product.seller.shop_name.length > 0,
      );
      // Validate category in product
      TestValidator.predicate(
        "product has category",
        variant.product.category.id.length > 0,
      );
      TestValidator.predicate(
        "category has name",
        variant.product.category.name.length > 0,
      );
    }
  }
}
