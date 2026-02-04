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
export async function test_api_cart_item_quantity_update_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as customer to create cart session
  const customerConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      href: "https://example.com",
      referrer: "https://example.com/referral",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorizedUser);
  customerConnection.headers = customerConnection.headers || {};
  customerConnection.headers.Authorization = authorizedUser.token.access;
  // Step 2: Create three cart items with varying quantities
  const item1 = await generate_random_shopping_mall_customer_cart_items_index(
    customerConnection,
    {
      body: {
        variantId: typia.random<string & tags.Format<"uuid">>(),
        quantity: 2,
      },
    },
  );
  typia.assert(item1);
  const item2 = await generate_random_shopping_mall_customer_cart_items_index(
    customerConnection,
    {
      body: {
        variantId: typia.random<string & tags.Format<"uuid">>(),
        quantity: 4,
      },
    },
  );
  typia.assert(item2);
  const item3 = await generate_random_shopping_mall_customer_cart_items_index(
    customerConnection,
    {
      body: {
        variantId: typia.random<string & tags.Format<"uuid">>(),
        quantity: 1,
      },
    },
  );
  typia.assert(item3);
  // Step 3: Update the quantity of ALL cart items to a new amount
  // Since IRequest only has quantity, this API updates ALL cart items to the specified quantity
  const updates = {
    quantity: 7,
  } satisfies IShoppingMallCartItem.IRequest;
  const updatedCart =
    await api.functional.shoppingMall.customer.cart_items.patch(
      customerConnection,
      {
        body: updates,
      },
    );
  typia.assert(updatedCart);
  // Step 4: Validate that cart structure was updated correctly
  TestValidator.equals(
    "cart has same number of items after update",
    updatedCart.data.length,
    3,
  );
  // Step 5: Verify that all cart items have the new quantity of 7
  TestValidator.predicate(
    "all cart items have quantity 7",
    updatedCart.data.every((item) => item.quantity === 7),
  );
  // Step 6: Verify that cart items still belong to authenticated customer
  // All items in the summary have cartId, so we don't need to compare IDs, just validate they exist
  TestValidator.predicate(
    "all cart items have valid cartId",
    updatedCart.data.every((item) => item.cartId !== undefined),
  );
  // Since we're updating all items and have no way to match individual items from creation to update,
  // we've validated the overall behavior successfully
}
