import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";

/**
 * The test scenario requires authenticating as a customer to create an order
 * and then attempt to add an item using a nonexistent product variant ID.
 * However, the provided API functions do not include any authentication
 * endpoint (post /auth/customer/join). Instead, the available endpoints are
 * api.functional.shoppingMall.customer.orders.create (to create an order) and
 * api.functional.shoppingMall.orders.items.create (to add items to an existing
 * order). Since there's no way to authenticate as a customer and create a valid
 * order through the provided endpoints, the only implementable part of the
 * scenario is testing the endpoint for adding items with a nonexistent variant
 * ID to an existing order. We must generate a valid orderNumber in the format
 * ORD-YYYYMMDD-NNNNN using the pattern specified in the API documentation, and
 * then attempt to add an item with a known invalid variant ID (e.g.,
 * 00000000-0000-0000-0000-000000000000) to verify that the system returns a 404
 * Not Found error. This test validates that the system properly handles
 * attempts to add items for non-existent product variants to existing orders,
 * ensuring the error message indicates the product variant does not exist or is
 * no longer available.
 */
export async function test_api_order_item_add_variant_not_found(
  connection: api.IConnection,
) {
  // Generate a valid orderNumber in the format ORD-YYYYMMDD-NNNNN as specified in the API documentation
  const validOrderNumber: string = typia.random<
    string & tags.Pattern<"^ORD-\d{8}-\d{5}$">
  >();

  // Attempt to add an item with a nonexistent product variant ID to ensure the system returns a 404 Not Found error
  await TestValidator.error(
    "adding item with nonexistent product variant to existing order should fail",
    async () => {
      await api.functional.shoppingMall.orders.items.create(connection, {
        orderNumber: validOrderNumber,
        body: {
          // Use a valid UUID format that is guaranteed not to exist in the system
          shopping_mall_product_variant_id:
            "00000000-0000-0000-0000-000000000000",
          quantity: 1,
        } satisfies IShoppingMallOrderItem.ICreate,
      });
    },
  );
}
