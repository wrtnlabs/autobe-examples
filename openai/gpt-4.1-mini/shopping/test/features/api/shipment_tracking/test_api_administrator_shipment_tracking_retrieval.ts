import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTracking";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { generate_random_shopping_mall_seller_shipments_trackings_create_tracking } from "../../../generate/generate_random_shopping_mall_seller_shipments_trackings_create_tracking";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_tracking } from "../../../prepare/prepare_random_shopping_mall_shipment_tracking";

export async function test_api_administrator_shipment_tracking_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = typia.random<IShoppingMallAdministrator.IJoin>();
  await authorize_administrator_join(adminConnection, { body: adminJoinBody });
  const adminLoginBody = typia.random<IShoppingMallAdministrator.ILogin>();
  await authorize_administrator_login(adminConnection, {
    body: adminLoginBody,
  });
  // 2. Seller join and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinBody = typia.random<IShoppingMallSeller.IJoin>();
  await authorize_seller_join(sellerConnection, { body: sellerJoinBody });
  const sellerLoginBody = typia.random<IShoppingMallSeller.ILogin>();
  await authorize_seller_login(sellerConnection, { body: sellerLoginBody });
  // 3. Seller creates a shipment
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {},
  );
  typia.assert(shipment);
  // 4. Seller adds a shipment tracking record
  const shipmentTracking =
    await generate_random_shopping_mall_seller_shipments_trackings_create_tracking(
      sellerConnection,
      {
        params: {
          shipmentId: (shipment as any).id /* cast to access id if exists*/,
        },
      },
    );
  typia.assert(shipmentTracking);
  // 5. Administrator retrieves tracking details
  const tracking =
    await api.functional.shoppingMall.administrator.shipments.trackings.atTracking(
      adminConnection,
      {
        shipmentId: (shipment as any).id /* cast to access id if exists */,
        trackingId: (shipmentTracking as any)
          .id /* cast to access id if exists*/,
      },
    );
  typia.assert(tracking);
  // Validate carrierName and trackingNumber correctness if present
  // Use optional chaining to avoid errors due to missing properties
  TestValidator.equals(
    "carrier name matches",
    (tracking as any)?.carrierName,
    (shipmentTracking as any)?.carrierName,
  );
  TestValidator.equals(
    "tracking number matches",
    (tracking as any)?.trackingNumber,
    (shipmentTracking as any)?.trackingNumber,
  );
  // 6. Unauthorized access validation
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "access denied for unauthorized",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.shipments.trackings.atTracking(
        unauthorizedConnection,
        {
          shipmentId: (shipment as any).id,
          trackingId: (shipmentTracking as any).id,
        },
      );
    },
  );
  // 7. Error handling: non-existent shipmentId
  const fakeShipmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "not found for invalid shipmentId",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.shipments.trackings.atTracking(
        adminConnection,
        {
          shipmentId: fakeShipmentId,
          trackingId: (shipmentTracking as any).id,
        },
      );
    },
  );
  // 8. Error handling: non-existent trackingId
  const fakeTrackingId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "not found for invalid trackingId",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.shipments.trackings.atTracking(
        adminConnection,
        {
          shipmentId: (shipment as any).id,
          trackingId: fakeTrackingId,
        },
      );
    },
  );
  // 9. Error handling: mismatched trackingId with shipmentId
  const anotherShipment =
    await generate_random_shopping_mall_seller_shipments_create(
      sellerConnection,
      {},
    );
  typia.assert(anotherShipment);
  await TestValidator.httpError(
    "not found for mismatched trackingId and shipmentId",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.shipments.trackings.atTracking(
        adminConnection,
        {
          shipmentId: (anotherShipment as any).id,
          trackingId: (shipmentTracking as any).id,
        },
      );
    },
  );
}
