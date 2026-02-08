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

export async function test_api_customer_sale_favorites_toggle_remove_favorite(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: This scenario tests the edge case where an already favorited sale item is unfavorited.
  // 1. Customer join and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const joinBody: IShoppingMallCustomer.IJoin = {};
  const authorized = await authorize_customer_join(customerConnection, {
    body: joinBody,
  });
  customerConnection.headers = { Authorization: authorized.token.access };
  // 2. Prepare a sale item id to toggle favorite status
  // We generate a UUID string to simulate a sale item (as the DTO type is empty, but toggle expects a sale item id to be toggled)
  // Since IShoppingMallSaleFavorite.IToggle type is {} in definition, but logically it should have sale item ID
  // We infer the minimal property keys in the toggle payload to be { sale_id: string }
  // BUT to comply with the exact DTO, we must generate only empty object because the type is empty
  // To satisfy scenario (toggle favorite) we will send an empty object, assuming the backend handles the sale item identification by customer token context only or a fixed sale id in test env
  // Since the DTO is empty, simulate with empty.
  // We will perform toggle twice to simulate favorite and unfavorite of the same item
  // 3. First toggle to ensure it is favorited
  const firstToggleResponse: IShoppingMallSaleFavorite.IToggle =
    await api.functional.shoppingMall.customer.sale_favorites.toggle(
      customerConnection,
      { body: {} },
    );
  typia.assert(firstToggleResponse);
  // 4. Second toggle to unfavorite the same sale item
  const secondToggleResponse: IShoppingMallSaleFavorite.IToggle =
    await api.functional.shoppingMall.customer.sale_favorites.toggle(
      customerConnection,
      { body: {} },
    );
  typia.assert(secondToggleResponse);
  // 5. Validate the unfavorite action: Response should indicate no favorite (favorited: false)
  // Since DTO IToggle is empty, we expect no properties, so validate by deep equality between first and second toggle indicating change
  TestValidator.notEquals(
    "Toggle favorite status changes",
    firstToggleResponse,
    secondToggleResponse,
  );
  // There is no explicit favorite status property in the DTO, so further database validation or wishlist check is not possible here
  // This test confirms that toggling twice changes state
}
