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

export async function test_api_customer_sale_favorites_toggle_add_favorite(
  connection: api.IConnection,
): Promise<void> {
  // This scenario tests the primary success path of favoriting a new sale item by a newly joined customer
  // Step 1: Customer join and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinInput: IShoppingMallCustomer.IJoin = {};
  const authorized = await authorize_customer_join(customerConnection, {
    body: customerJoinInput,
  });
  // Update customer connection authorization header
  customerConnection.headers = { Authorization: authorized.token.access };
  // Step 2: Prepare sale item ID for toggle
  // Since IShoppingMallSaleFavorite.IToggle is an empty type in schema,
  // but the request requires sale item id, we simulate by passing a fake property 'sale_id' as UUID.
  // Note: This is an improvisation due to incomplete DTO definition.
  const toggleInput = {
    sale_id: typia.random<string & tags.Format<"uuid">>(),
  } as any;
  // Step 3: Call toggle favorite API
  const toggleResult =
    await api.functional.shoppingMall.customer.sale_favorites.toggle(
      customerConnection,
      { body: toggleInput },
    );
  // Step 4: Assert response
  typia.assert(toggleResult);
  // Step 5: Verify the favorite status is true
  TestValidator.predicate(
    "sale item is favorited",
    (toggleResult as any).favorited === true,
  );
}
