import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryHistory";
import type { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_inventory_history_access_denied_without_auth(
  connection: api.IConnection,
): Promise<void> {
  // Validate that an unauthenticated or unauthorized user cannot retrieve the inventory history.
  // Attempt the operation without a valid authorization token and confirm the server returns
  // an appropriate unauthorized HTTP status. This ensures that inventory history access is restricted
  // to authenticated sellers only.
  // Call the seller join to create a new seller but DO NOT use the token for auth
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      shopName: "Test Shop",
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(seller);
  // Create a new connection WITHOUT authorization headers
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  const requestBody: IShoppingMallInventoryHistory.IRequest = {
    shoppingMallProductVariantId: undefined,
    startDate: null,
    endDate: null,
    reason: undefined,
    page: undefined,
    limit: undefined,
  };
  // Attempt to call inventory history PATCH without auth expecting to fail
  await TestValidator.httpError(
    "unauthorized access to inventory history should fail",
    401,
    async () => {
      await api.functional.shoppingMall.seller.inventoryHistories.index(
        unauthenticatedConnection,
        {
          body: requestBody,
        },
      );
    },
  );
}
