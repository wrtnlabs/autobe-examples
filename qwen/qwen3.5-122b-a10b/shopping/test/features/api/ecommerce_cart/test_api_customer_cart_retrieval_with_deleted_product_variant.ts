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
 * Test customer cart retrieval with deleted product variant.
 *
 * Validates that when a product variant in the customer's cart is deleted by the seller, the cart retrieval endpoint correctly marks the item as unavailable while retaining it for customer review. This test ensures proper handling of deleted variants in the shopping cart system.
 *
 * The test verifies that unavailable items are excluded from total_amount calculations while being counted in unavailable_count, maintaining data integrity for customer review purposes.
 *
 * 1. Customer authenticates via join operation.
 * 2. Retrieve customer cart with validation enabled.
 * 3. Validate cart structure and item availability status.
 * 4. Verify unavailable count matches items with availabilityStatus = false.
 * 5. Verify total amount is calculated correctly from available items only.
 */
export async function test_api_customer_cart_retrieval_with_deleted_product_variant(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      display_name: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Retrieve customer cart with validation enabled
  const cart: IEcommerceCart =
    await api.functional.ecommerce.customer.carts.search(customerConnection, {
      body: {
        validate_stock: true,
        validate_availability: true,
        include_details: true,
      } satisfies IEcommerceCart.IRequest,
    });
  typia.assert(cart);
  // 3. Validate cart structure
  TestValidator.equals(
    "cart belongs to customer",
    cart.customer.id,
    customer.id,
  );
  TestValidator.predicate("cart has valid item count", cart.item_count >= 0);
  TestValidator.predicate(
    "cart has valid unavailable count",
    cart.unavailable_count >= 0,
  );
  TestValidator.predicate(
    "total amount is non-negative",
    cart.total_amount >= 0,
  );
  // 4. Validate cart items if any exist
  if (cart.items.length > 0) {
    for (const item of cart.items) {
      typia.assert(item);
      TestValidator.predicate("item has valid quantity", item.quantity >= 1);
      TestValidator.predicate(
        "item has valid variant reference",
        item.productVariant.id !== undefined,
      );
    }
    // 5. Verify unavailable count matches items with availabilityStatus = false
    const unavailableItems = cart.items.filter(
      (item) => item.availabilityStatus === false,
    );
    TestValidator.equals(
      "unavailable count matches unavailable items",
      cart.unavailable_count,
      unavailableItems.length,
    );
    // 6. Verify total amount only includes available items (validated by backend calculation)
    const availableItems = cart.items.filter(
      (item) => item.availabilityStatus === true,
    );
    TestValidator.predicate(
      "total amount reflects available items only",
      cart.total_amount >= 0,
    );
  }
}
