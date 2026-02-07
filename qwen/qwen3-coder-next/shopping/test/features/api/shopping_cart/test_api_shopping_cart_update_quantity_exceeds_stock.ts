import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_shopping_cart_update_quantity_exceeds_stock(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Login customer
  const customerAuthConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerAuthConnection, {
    body: {
      email: customer.token.access,
      password: "1234",
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 3. Test cart quantity update that exceeds stock
  const updateRequest = {
    quantity: 10,
  } satisfies IShoppingMallCart.IUpdate;
  await TestValidator.error(
    "should reject update when quantity exceeds available stock",
    async () => {
      await api.functional.shoppingMall.customer.carts.patch(
        customerAuthConnection,
        {
          body: updateRequest,
        },
      );
    },
  );
  // 4. Verify normal cart update works
  const cartSummary = await api.functional.shoppingMall.customer.carts.patch(
    customerAuthConnection,
    {
      body: {
        quantity: 2,
      } satisfies IShoppingMallCart.IUpdate,
    },
  );
  typia.assert(cartSummary);
}
