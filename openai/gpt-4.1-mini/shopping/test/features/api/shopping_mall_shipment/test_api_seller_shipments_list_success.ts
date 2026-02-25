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

export async function test_api_seller_shipments_list_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins with random valid data
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, { body: {} });
  typia.assert(seller);
  // Refresh connection with authorization token
  sellerConnection.headers = { Authorization: `Bearer ${seller.token.access}` };
  // 2. Send a shipment list request with pagination parameters
  const requestBody: IShoppingMallShipment.IRequest = {
    page: 1,
    limit: 10,
  };
  const shipmentsResponse =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: requestBody,
    });
  typia.assert(shipmentsResponse);
  // 3. Validate pagination metadata
  const { pagination, data } = shipmentsResponse;
  TestValidator.predicate(
    "pagination current page positive",
    pagination.current > 0,
  );
  TestValidator.predicate("pagination limit positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination records non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    pagination.pages >= 0,
  );
  // 4. Validate that all shipments belong to the authenticated seller
  for (const shipment of data) {
    typia.assert(shipment);
    TestValidator.equals("shipment seller id", shipment.seller.id, seller.id);
    TestValidator.equals(
      "shipment seller email",
      shipment.seller.email,
      seller.email,
    );
    TestValidator.equals(
      "shipment seller shopName",
      shipment.seller.shopName,
      seller.shopName,
    );
  }
  // 5. Validate ordering by createdAt descending
  for (let i = 1; i < data.length; i++) {
    const cur = new Date(data[i - 1].createdAt).getTime();
    const next = new Date(data[i].createdAt).getTime();
    TestValidator.predicate(
      `shipment ordering by createdAt descending index ${i - 1} > ${i}`,
      cur >= next,
    );
  }
}
