import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSaleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleFavorite";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_sale_favorites_create } from "../../../generate/generate_random_shopping_mall_customer_sale_favorites_create";
import { prepare_random_shopping_mall_sale_favorite } from "../../../prepare/prepare_random_shopping_mall_sale_favorite";

export async function test_api_customer_sale_favorites_create_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Successful creation of a new favorite sale item by an authenticated customer.
  // 1. Customer registers and authenticates
  const userConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_customer_join(userConnection, { body: {} });
  userConnection.headers = { Authorization: `Bearer ${auth.token.access}` };
  // 2. Create a new favorite sale item using the utility function
  const favorite =
    await generate_random_shopping_mall_customer_sale_favorites_create(
      userConnection,
      { body: {} },
    );
  typia.assert(favorite);
}
