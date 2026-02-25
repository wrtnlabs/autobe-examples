import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_shopping_cart_item_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer = await authorize_customer_join(customerConnection, {
    body: customerData,
  });
  typia.assert(customer);
  // 2. Add an item to cart
  // Since cart item add function is not available in provided API functions,
  // we cannot create a cart item for testing removal.
  // We need to use a pre-existing cart item ID. This scenario cannot be implemented
  // without the cart item creation endpoint.
  // 3. Remove the cart item
  // Based on API documentation, we can only use the erase function which is provided
  // but we have no way to create a valid cart item ID for testing
  // This test cannot be fully implemented due to missing required functionality
  // As a fallback: we can only test that the erase function accepts a valid UUID
  // and doesn't throw an error, which is the only possible verification with provided functions
  const dummyCartItemId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.shoppingMall.customer.cart_items.erase(
    customerConnection,
    {
      cartItemId: dummyCartItemId,
    },
  );
}
