import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_shipments_list_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication - join to get auth token
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234",
      shopName: RandomGenerator.name(1),
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(sellerAuthorized);
  // 2. Create new seller connection with Authorization header
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuthorized.token.access}`,
  };
  // 3. Perform search for shipments with filter that results in no data
  // Request a page that almost certainly does not exist to trigger empty
  const emptyRequestBody: IShoppingMallShipment.IRequest = {
    page: 9999,
    limit: 100,
  };
  const shipments = await api.functional.shoppingMall.seller.shipments.index(
    sellerConnection,
    { body: emptyRequestBody },
  );
  typia.assert(shipments);
  // 4. Validate that shipments list is empty
  TestValidator.equals(
    "shipments data should be empty",
    shipments.data.length,
    0,
  );
  // 5. Validate pagination metadata correctness
  TestValidator.equals(
    "pagination current page",
    shipments.pagination.current,
    emptyRequestBody.page ?? 1,
  );
  TestValidator.equals(
    "pagination limit",
    shipments.pagination.limit,
    emptyRequestBody.limit ?? 100,
  );
  TestValidator.equals("pagination records", shipments.pagination.records, 0);
  TestValidator.equals("pagination pages", shipments.pagination.pages, 0);
  // 6. Authorization enforcement - attempt access without token
  const noAuthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access returns 401",
    401,
    async () => {
      await api.functional.shoppingMall.seller.shipments.index(
        noAuthConnection,
        { body: emptyRequestBody },
      );
    },
  );
}
