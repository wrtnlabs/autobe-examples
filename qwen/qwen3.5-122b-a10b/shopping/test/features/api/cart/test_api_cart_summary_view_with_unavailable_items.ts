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
 * Test customer cart summary retrieval and structure validation.
 *
 * Validates that a customer can successfully retrieve their shopping cart summary with proper structure including items array, total price calculation, and all required fields. The cart summary should include product variant details with stock information.
 *
 * 1. Customer registers with valid credentials.
 * 2. Customer retrieves cart summary.
 * 3. Validates cart summary structure includes id, items array, and total_price.
 * 4. Validates each cart item has proper variant information.
 */
export async function test_api_cart_summary_view_with_unavailable_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
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
  // 2. Retrieve cart summary
  const cart =
    await api.functional.ecommerce.customer.cart.summary.at(customerConnection);
  typia.assert(cart);
  // 3. Validate cart structure
  TestValidator.predicate("cart has valid id", cart.id.length > 0);
  TestValidator.predicate("cart has items array", Array.isArray(cart.items));
  TestValidator.predicate(
    "cart has total price",
    typeof cart.total_price === "number",
  );
  // 4. Validate cart items if any exist
  if (cart.items.length > 0) {
    for (const item of cart.items) {
      TestValidator.predicate("item has valid id", item.id.length > 0);
      TestValidator.predicate("item has quantity", item.quantity > 0);
      TestValidator.predicate(
        "item has productVariant",
        item.productVariant !== null && item.productVariant !== undefined,
      );
      TestValidator.predicate(
        "variant has sku_code",
        item.productVariant.sku_code.length > 0,
      );
      TestValidator.predicate(
        "variant has stock_count",
        typeof item.productVariant.stock_count === "number",
      );
      TestValidator.predicate(
        "variant has product reference",
        item.productVariant.product !== null &&
          item.productVariant.product !== undefined,
      );
    }
  }
}
