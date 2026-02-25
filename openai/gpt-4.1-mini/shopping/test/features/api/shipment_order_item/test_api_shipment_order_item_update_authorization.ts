import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_shipment_order_item_update_authorization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Attempt update without authentication (no token)
  await TestValidator.httpError(
    "unauthorized update without token",
    401,
    async () => {
      await api.functional.shoppingMall.seller.shipmentOrderItems.updateShipmentOrderItem(
        connection,
        {
          shipmentOrderItemId: typia.random<string & tags.Format<"uuid">>(),
          body: {},
        },
      );
    },
  );
  // 2. Create a seller account to get authorized seller connection
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test_password_123",
      shopName: "TestShop",
      shopDescription: null,
      logoUri: null,
    },
  });
  // Setup seller connection with auth token
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // 3. Attempt update without seller role - simulate non-seller (simulate by removing Authorization or invalid token)
  // Forcing a non-seller invalid token connection
  const badAuthConnection: api.IConnection = { host: connection.host };
  badAuthConnection.headers = { Authorization: "Bearer invalidtoken" };
  await TestValidator.httpError(
    "forbidden update with invalid token",
    403,
    async () => {
      await api.functional.shoppingMall.seller.shipmentOrderItems.updateShipmentOrderItem(
        badAuthConnection,
        {
          shipmentOrderItemId: typia.random<string & tags.Format<"uuid">>(),
          body: {},
        },
      );
    },
  );
}
