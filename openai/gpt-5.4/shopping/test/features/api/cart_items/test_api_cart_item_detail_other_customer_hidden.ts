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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";

export async function test_api_cart_item_detail_other_customer_hidden(
  connection: api.IConnection,
): Promise<void> {
  const firstCustomerConnection: api.IConnection = {
    host: connection.host,
  };
  const firstCustomer = await authorize_customer_join(
    firstCustomerConnection,
    {},
  );
  typia.assert(firstCustomer);
  const createdCartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      firstCustomerConnection,
      {},
    );
  typia.assert(createdCartItem);
  const secondCustomerConnection: api.IConnection = {
    host: connection.host,
  };
  const secondCustomer = await authorize_customer_join(
    secondCustomerConnection,
    {},
  );
  typia.assert(secondCustomer);
  await TestValidator.httpError(
    "other customer cannot read foreign cart item",
    404,
    async () => {
      await api.functional.shoppingMall.customer.cartItems.at(
        secondCustomerConnection,
        {
          cartItemId: createdCartItem.id,
        },
      );
    },
  );
}
