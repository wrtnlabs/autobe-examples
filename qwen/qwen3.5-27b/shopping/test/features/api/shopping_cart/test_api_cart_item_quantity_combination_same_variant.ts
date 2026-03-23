import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_customers_me_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_cart_items_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";

/**
 * Test cart item quantity combination when adding the same variant multiple times.
 *
 * 1. Register and authenticate as a customer
 * 2. Add a variant to cart with quantity 3 (initial cart item)
 * 3. Add the same variant again with quantity 5
 * 4. Verify quantities are combined (3 + 5 = 8), not duplicated
 * 5. Verify cart item ID remains the same
 * 6. Verify subtotal is recalculated correctly
 */
export async function test_api_cart_item_quantity_combination_same_variant(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Add variant to cart with quantity 3 (initial cart item)
  const initialCartItem =
    await generate_random_shopping_mall_customer_customers_me_cart_items_create(
      customerConnection,
      {
        body: {
          quantity: 3,
        },
      },
    );
  typia.assert(initialCartItem);
  // Store initial values for comparison
  const initialId = initialCartItem.id;
  const initialCreatedAt = initialCartItem.created_at;
  const initialVariantId = initialCartItem.variant.id;
  const initialQuantity = initialCartItem.quantity;
  const initialSubtotal = initialCartItem.subtotal;
  const initialUpdatedAt = initialCartItem.updated_at;
  // Validate initial cart item has quantity 3
  TestValidator.equals("initial quantity is 3", initialQuantity, 3);
  TestValidator.equals(
    "initial deleted_at is null",
    initialCartItem.deleted_at,
    null,
  );
  // 3. Add the same variant again with quantity 5
  const combinedCartItem =
    await generate_random_shopping_mall_customer_customers_me_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: initialVariantId,
          quantity: 5,
        },
      },
    );
  typia.assert(combinedCartItem);
  // 4. Verify quantities are combined (3 + 5 = 8)
  const combinedQuantity = combinedCartItem.quantity;
  TestValidator.equals(
    "quantities are combined (3 + 5 = 8)",
    combinedQuantity,
    8,
  );
  // 5. Verify cart item ID remains the same (not duplicated)
  TestValidator.equals(
    "cart item ID unchanged",
    combinedCartItem.id,
    initialId,
  );
  // 6. Verify created_at timestamp is preserved
  TestValidator.equals(
    "created_at preserved",
    combinedCartItem.created_at,
    initialCreatedAt,
  );
  // 7. Verify updated_at timestamp is refreshed
  TestValidator.notEquals(
    "updated_at is refreshed",
    combinedCartItem.updated_at,
    initialUpdatedAt,
  );
  // 8. Verify subtotal is recalculated correctly (price × 8)
  const pricePerUnit = initialSubtotal / initialQuantity;
  const expectedSubtotal = pricePerUnit * combinedQuantity;
  TestValidator.equals(
    "subtotal recalculated correctly",
    combinedCartItem.subtotal,
    expectedSubtotal,
  );
  // 9. Verify variant information is preserved
  TestValidator.equals(
    "variant ID preserved",
    combinedCartItem.variant.id,
    initialVariantId,
  );
  TestValidator.equals(
    "product ID preserved",
    combinedCartItem.product.id,
    initialCartItem.product.id,
  );
  // 10. Verify cart item is still active (not deleted)
  TestValidator.equals(
    "combined deleted_at is null",
    combinedCartItem.deleted_at,
    null,
  );
  // 11. Verify quantity constraint (minimum 1)
  TestValidator.predicate(
    "combined quantity meets minimum constraint",
    combinedQuantity >= 1,
  );
}
