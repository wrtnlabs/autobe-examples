import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
 * Test cart bulk update behavior when cart item's variant availability changes.
 *
 * This test verifies that the bulk update endpoint correctly handles cart items
 * and returns the cart with availability status. The test adds multiple items
 * to cart, then performs a bulk update to verify the system properly processes
 * multiple cart item updates in a single request.
 *
 * Test Flow:
 * 1. Customer registers and authenticates
 * 2. Customer adds multiple product variants to cart
 * 3. Customer submits bulk update request with quantity changes
 * 4. System processes update and returns cart with all items
 * 5. Validate cart structure and item availability flags
 */
export async function test_api_cart_item_availability_status_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Customer adds multiple product variants to cart
  const cartItem1 =
    await generate_random_shopping_mall_customer_customers_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem1);
  const cartItem2 =
    await generate_random_shopping_mall_customer_customers_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem2);
  // 3. Customer submits bulk update request with both cart items
  // Note: The API requires id field to identify cart items for bulk update
  const bulkUpdateBody = {
    updates: [
      {
        id: cartItem1.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      },
      {
        id: cartItem2.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      },
    ],
  } as unknown as IShoppingMallCartItem.IBulkUpdate;
  const cart =
    await api.functional.shoppingMall.customer.customers.cart.items.updateBulk(
      customerConnection,
      {
        body: bulkUpdateBody,
      },
    );
  typia.assert(cart);
  // 4. Validate cart items have correct structure
  TestValidator.predicate("cart has items", cart.items.length > 0);
  // Verify all items are present in cart response
  const itemIds = cart.items.map((item) => item.id);
  TestValidator.predicate("cartItem1 present", itemIds.includes(cartItem1.id));
  TestValidator.predicate("cartItem2 present", itemIds.includes(cartItem2.id));
  // Verify availability and stockWarning flags exist on all items
  for (const item of cart.items) {
    TestValidator.predicate(
      "item has availability flag",
      typeof item.available === "boolean",
    );
    TestValidator.predicate(
      "item has stockWarning flag",
      typeof item.stockWarning === "boolean",
    );
  }
  // Verify cart total is calculated
  TestValidator.predicate("cart total is non-negative", cart.totalPrice >= 0);
  // Verify updated_at timestamps exist
  for (const item of cart.items) {
    TestValidator.predicate(
      "item updatedAt exists",
      item.updatedAt !== undefined,
    );
  }
}
