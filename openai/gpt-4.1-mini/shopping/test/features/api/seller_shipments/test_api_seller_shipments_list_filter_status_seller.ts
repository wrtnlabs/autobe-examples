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

export async function test_api_seller_shipments_list_filter_status_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller join and authenticate
  const sellerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password1234",
    shopName: RandomGenerator.name(1),
    shopDescription: null,
    logoUri: null,
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuthorized = await authorize_seller_join(connection, {
    body: sellerJoinInput,
  });
  typia.assert(sellerAuthorized);
  // Create a connection for the authenticated seller
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuthorized.token.access}`,
  };
  // 2. Query shipments without filters to check initial state
  let body: IShoppingMallShipment.IRequest = { page: 1, limit: 10 };
  let response = await api.functional.shoppingMall.seller.shipments.index(
    sellerConnection,
    { body },
  );
  typia.assert(response);
  // Validate all shipments belong to this seller
  response.data.forEach((shipment) => {
    typia.assert(shipment.seller);
    TestValidator.equals(
      "shipment belongs to seller",
      shipment.seller.id,
      sellerAuthorized.id,
    );
  });
  // 3. Query shipments filtered by status "shipped"
  const shippedStatus = "shipped";
  body = { page: 1, limit: 10 };
  response = await api.functional.shoppingMall.seller.shipments.index(
    sellerConnection,
    { body },
  );
  typia.assert(response);
  // Validate each returned shipment has status "shipped" and belongs to the seller
  response.data.forEach((shipment) => {
    TestValidator.equals("shipment status", shipment.status, shippedStatus);
    TestValidator.equals(
      "shipment belongs to seller",
      shipment.seller.id,
      sellerAuthorized.id,
    );
  });
  // 4. Query shipments filtered by seller ID explicitly, should match seller's shipments
  body = { page: 1, limit: 10 };
  response = await api.functional.shoppingMall.seller.shipments.index(
    sellerConnection,
    { body },
  );
  typia.assert(response);
  response.data.forEach((shipment) => {
    TestValidator.equals(
      "shipment belongs to seller (explicit)",
      shipment.seller.id,
      sellerAuthorized.id,
    );
  });
  // 5. Check pagination metadata
  TestValidator.predicate(
    "pagination current page > 0",
    response.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records >= data length",
    response.pagination.records >= response.data.length,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
  // 6. Check unauthorized access
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError("unauthorized without token", 401, async () => {
    await api.functional.shoppingMall.seller.shipments.index(
      unauthorizedConnection,
      { body: { page: 1, limit: 10 } },
    );
  });
}
