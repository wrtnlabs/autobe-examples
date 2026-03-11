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
 * Tests the quantity merge behavior when a customer adds the same product variant to their cart twice.
 * This scenario validates the unique constraint behavior on (cart_id, variant_id) and automatic quantity aggregation.
 */
export async function test_api_cart_item_quantity_merge_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Setup customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Step 2: Use the utility function to create first cart item with quantity 2
  // The utility will generate a random variant and create the cart item
  const firstItem =
    await generate_random_shopping_mall_customer_customers_cart_items_create(
      customerConnection,
      {
        body: {
          quantity: 2,
        },
      },
    );
  typia.assert(firstItem);
  // Validate first cart item was created with quantity 2
  TestValidator.equals("first item quantity", firstItem.quantity, 2);
  // Step 3: Add the same variant again with quantity 3
  // Using the variantId from the first item ensures we're testing the merge behavior
  const secondItem =
    await api.functional.shoppingMall.customer.customers.cart.items.create(
      customerConnection,
      {
        body: {
          variantId: firstItem.variant.id,
          quantity: 3,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(secondItem);
  // Step 4: Verify quantity merge (2 + 3 = 5)
  TestValidator.equals("merged quantity", secondItem.quantity, 5);
  // Step 5: Verify same cart item (not a duplicate)
  TestValidator.equals("same cart item ID", secondItem.id, firstItem.id);
  // Step 6: Verify variant details remain consistent
  TestValidator.equals(
    "variant ID matches",
    secondItem.variant.id,
    firstItem.variant.id,
  );
}
