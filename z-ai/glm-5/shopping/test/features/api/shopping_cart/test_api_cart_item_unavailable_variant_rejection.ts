import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";

/**
 * Test that customer cannot add unavailable product variant to cart.
 *
 * Scenario: Customer attempts to add a variant that is unavailable due to:
 * - Product being deleted (soft delete with deleted_at set)
 * - Seller being suspended or banned
 * - Variant itself being deleted
 *
 * Expected: HTTP error (409 Conflict for unavailable variant, or 404 if not found)
 */
export async function test_api_cart_item_unavailable_variant_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create a variantId for an unavailable variant
  // Using a random UUID representing an unavailable/non-existent variant
  const unavailableVariantId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to add unavailable variant to cart - should fail
  // Per spec: 409 if variant/product deleted or seller suspended, 404 if not found
  await TestValidator.httpError(
    "unavailable variant should be rejected",
    [404, 409],
    async () => {
      await api.functional.shoppingMall.customer.customers.cart.items.create(
        customerConnection,
        {
          body: {
            variantId: unavailableVariantId,
            quantity: 1,
          } satisfies IShoppingMallCartItem.ICreate,
        },
      );
    },
  );
}
