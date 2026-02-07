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

export async function test_api_seller_shipment_search_and_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create seller-specific connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(3),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Search and filter shipments
  const result: IPageIShoppingMallShipment.ISummary =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {},
    } satisfies IShoppingMallShipment.IRequest);
  // Validate response structure
  typia.assert(result);
  // Validate pagination structure
  TestValidator.equals("pagination exists", result.pagination.current, 1);
  TestValidator.predicate(
    "pagination has valid limit",
    result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has valid records",
    result.pagination.records >= 0,
  );
  // Validate data array structure
  TestValidator.predicate("data is array", Array.isArray(result.data));
  TestValidator.equals(
    "data count matches records",
    result.data.length,
    result.pagination.records,
  );
}
