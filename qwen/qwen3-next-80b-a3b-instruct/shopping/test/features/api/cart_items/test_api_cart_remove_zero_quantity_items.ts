import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { generate_random_shopping_mall_customer_cart_items_index } from "../../../generate/generate_random_shopping_mall_customer_cart_items_index";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
export async function test_api_cart_remove_zero_quantity_items(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create customer connection and join
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/referral",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Step 2: Create first product variant and add to cart
  const product1 =
    await generate_random_shopping_mall_customer_cart_items_index(
      customerConnection,
      {
        body: {
          variantId: typia.random<string & tags.Format<"uuid">>(),
          quantity: 3,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(product1);
  // Step 3: Create second product variant and add to cart
  const product2 =
    await generate_random_shopping_mall_customer_cart_items_index(
      customerConnection,
      {
        body: {
          variantId: typia.random<string & tags.Format<"uuid">>(),
          quantity: 5,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(product2);
  // Step 4: Update cart to reduce quantities to zero (this should remove items)
  // The API expects an array of cart item updates with quantities
  const updateResult =
    await api.functional.shoppingMall.customer.cart_items.patch(
      customerConnection,
      {
        body: {
          quantity: 0,
        } satisfies IShoppingMallCartItem.IRequest,
      },
    );
  typia.assert(updateResult);
  // Step 5: Validate cart items are removed and cart updated
  // Since we set quantity to 0, both items should be removed
  TestValidator.equals(
    "cart should have 0 items after update",
    updateResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "cart should have no items",
    updateResult.data.length,
    0,
  );
}
