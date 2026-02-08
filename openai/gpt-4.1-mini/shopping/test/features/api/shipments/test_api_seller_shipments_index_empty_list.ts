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

export async function test_api_seller_shipments_index_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create actor-specific seller connection and authorize (register)
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(authorizedSeller);
  // Update connection with token
  sellerConnection.headers ??= {};
  sellerConnection.headers.Authorization = authorizedSeller.token.access;
  // 2. Query shipments list with empty filter (default pagination should apply)
  const response = await api.functional.shoppingMall.seller.shipments.index(
    sellerConnection,
    {
      body: {}, // IShoppingMallShipment.IRequest is empty interface
    },
  );
  // 3. Validate response structure
  typia.assert<IPageIShoppingMallShipment.ISummary>(response);
  // 4. Business logic assertions
  TestValidator.equals("shipment list is empty", response.data.length, 0);
  TestValidator.equals(
    "shipment pagination records count",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "shipment pagination pages count",
    response.pagination.pages,
    0,
  );
  TestValidator.equals(
    "shipment pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "shipment pagination limit non-negative",
    response.pagination.limit >= 0,
  );
}
