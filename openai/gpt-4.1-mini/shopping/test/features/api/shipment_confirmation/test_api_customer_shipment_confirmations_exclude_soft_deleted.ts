import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipmentConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentConfirmation";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentConfirmation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_customer_shipment_confirmations_exclude_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins and logs in
  const customerJoinConn: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerJoinConn, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  typia.assert(customerJoin);
  // Customer connection with authorization headers
  const customerConn: api.IConnection = {
    host: connection.host,
    headers: { Authorization: customerJoin.token.access },
  };
  // 2. Seller joins and logs in
  const sellerJoinConn: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerJoinConn, { body: {} });
  typia.assert(sellerJoin);
  // Seller connection with authorization headers
  const sellerConn: api.IConnection = {
    host: connection.host,
    headers: { Authorization: sellerJoin.token.access },
  };
  // 3. Seller creates a shipment (prerequisite)
  const shipmentRaw =
    await generate_random_shopping_mall_seller_shipments_create(sellerConn, {
      body: {},
    });
  const shipment = shipmentRaw as IShoppingMallShipment & {
    id: string;
  };
  typia.assert(shipment);
  // 4. Call shipment confirmations index endpoint WITHOUT filters
  const unfilteredOutput =
    await api.functional.shoppingMall.customer.shipment_confirmations.index(
      customerConn,
      { body: {} },
    );
  typia.assert(unfilteredOutput);
  // 5. Call shipment confirmations index endpoint WITH shipment_id filter
  const filteredOutput =
    await api.functional.shoppingMall.customer.shipment_confirmations.index(
      customerConn,
      { body: { shipment_id: shipment.id } },
    );
  typia.assert(filteredOutput);
  // 6. Validate pagination metadata for filtered result
  TestValidator.predicate(
    "pagination current >= 1",
    filteredOutput.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit >= 0",
    filteredOutput.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records >= data length",
    filteredOutput.pagination.records >= filteredOutput.data.length,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    filteredOutput.pagination.pages >= 0,
  );
}
