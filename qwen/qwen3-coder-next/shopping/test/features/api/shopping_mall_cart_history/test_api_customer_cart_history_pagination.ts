import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartHistory";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartHistory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_carts_create } from "../../../generate/generate_random_shopping_mall_customer_carts_create";
import { prepare_random_shopping_mall_cart } from "../../../prepare/prepare_random_shopping_mall_cart";

export async function test_api_customer_cart_history_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const joinResult = await api.functional.shoppingMall.auth.customer.join(
    customerConnection,
    {
      body: typia.random<IShoppingMallCustomer.IJoin>(),
    },
  );
  typia.assert(joinResult);
  // 2. Add item to cart
  const cart1 = await api.functional.shoppingMall.customer.carts.create(
    customerConnection,
    {
      body: typia.random<IShoppingMallCart.ICreate>(),
    },
  );
  typia.assert(cart1);
  // 3. Update cart quantity
  await api.functional.shoppingMall.customer.carts.patch(customerConnection, {
    body: typia.random<IShoppingMallCart.IUpdate>(),
  });
  // 4. Add another cart item
  const cart2 = await api.functional.shoppingMall.customer.carts.create(
    customerConnection,
    {
      body: typia.random<IShoppingMallCart.ICreate>(),
    },
  );
  typia.assert(cart2);
  // 5. Retrieve history with pagination - generate a cart ID since IShoppingMallCart has no id property
  const cartId = typia.random<string & tags.Format<"uuid">>();
  const history =
    await api.functional.shoppingMall.customer.carts.history.index(
      customerConnection,
      {
        cartId: cartId,
      },
    );
  typia.assert(history);
  // 6. Validate pagination metadata
  TestValidator.equals("current page is 1", history.pagination.current, 1);
  TestValidator.predicate("limit is positive", history.pagination.limit > 0);
  TestValidator.predicate(
    "pages calculation correct",
    history.pagination.pages >= 1,
  );
  // 7. Validate history data structure
  TestValidator.predicate("history has data", history.data.length > 0);
}
