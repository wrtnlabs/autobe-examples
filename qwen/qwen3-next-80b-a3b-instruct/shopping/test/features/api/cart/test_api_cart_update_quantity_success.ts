import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCartItemOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemOption";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cart_update_quantity_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Update quantity of cart item (assumed cart item ID is customer.id)
  // The IRequest for update includes optional page and limit
  const newQuantity = 1;
  const updatedCartItem =
    await api.functional.shoppingMall.customer.cart_items.update(
      customerConnection,
      {
        cartItemId: customer.id,
        body: {
          quantity: newQuantity,
          page: null,
          limit: null,
        } satisfies IShoppingMallCartItem.IRequest,
      },
    );
  typia.assert(updatedCartItem);
  // 3. Validate
  TestValidator.equals(
    "updated quantity matches",
    updatedCartItem.quantity,
    newQuantity,
  );
  TestValidator.predicate(
    "subtotal recalculated correctly",
    updatedCartItem.subtotal === updatedCartItem.price * newQuantity,
  );
  TestValidator.predicate(
    "in_stock is accurate",
    updatedCartItem.in_stock === true,
  );
}
