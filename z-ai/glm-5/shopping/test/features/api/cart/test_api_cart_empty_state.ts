import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
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

export async function test_api_cart_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create customer connection and register a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Step 2: Retrieve the cart for this newly registered customer
  const cart =
    await api.functional.shoppingMall.customer.carts.at(customerConnection);
  typia.assert(cart);
  // Step 3: Validate empty cart state
  // The business rule states: carts are not created until first item is added
  // Therefore, new customer should have empty cart representation
  TestValidator.equals("cart id should be null for empty cart", cart.id, null);
  TestValidator.equals("items array should be empty", cart.items.length, 0);
  TestValidator.equals(
    "total_price should be 0 for empty cart",
    cart.total_price,
    0,
  );
  TestValidator.equals(
    "created_at should be null for empty cart",
    cart.created_at,
    null,
  );
  TestValidator.equals(
    "updated_at should be null for empty cart",
    cart.updated_at,
    null,
  );
}
