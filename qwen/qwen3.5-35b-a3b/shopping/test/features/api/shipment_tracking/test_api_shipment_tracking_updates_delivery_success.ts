import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentTrackingUpdate } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentTrackingUpdate";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipmentTrackingUpdate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipmentTrackingUpdate";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_shipment_tracking_updates_delivery_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      href: "https://seller.example.com/join",
      referrer: "https://example.com",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Create shipment with tracking information (utility handles all required fields)
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {},
  );
  typia.assert(shipment);
  // 3. First tracking update: in_transit (package pickup)
  const inTransitPage =
    await api.functional.ecommerceMall.seller.shipments.tracking_updates.updateTrackingUpdates(
      sellerConnection,
      {
        shipmentId: shipment.id,
        body: {
          tracking_status: "in_transit",
        } satisfies IEcommerceMallShipmentTrackingUpdate.IRequest,
      },
    );
  typia.assert(inTransitPage);
  TestValidator.equals(
    "in_transit tracking update exists",
    inTransitPage.data.length,
    1,
  );
  TestValidator.equals(
    "in_transit status persisted",
    inTransitPage.data[0].tracking_status,
    "in_transit",
  );
  // 4. Second tracking update: out_for_delivery (same-day delivery)
  const outForDeliveryPage =
    await api.functional.ecommerceMall.seller.shipments.tracking_updates.updateTrackingUpdates(
      sellerConnection,
      {
        shipmentId: shipment.id,
        body: {
          tracking_status: "out_for_delivery",
        } satisfies IEcommerceMallShipmentTrackingUpdate.IRequest,
      },
    );
  typia.assert(outForDeliveryPage);
  TestValidator.equals(
    "out_for_delivery tracking update exists",
    outForDeliveryPage.data.length,
    2,
  );
  TestValidator.equals(
    "out_for_delivery status persisted",
    outForDeliveryPage.data[1].tracking_status,
    "out_for_delivery",
  );
  // 5. Third tracking update: delivered (successful delivery)
  const deliveredPage =
    await api.functional.ecommerceMall.seller.shipments.tracking_updates.updateTrackingUpdates(
      sellerConnection,
      {
        shipmentId: shipment.id,
        body: {
          tracking_status: "delivered",
        } satisfies IEcommerceMallShipmentTrackingUpdate.IRequest,
      },
    );
  typia.assert(deliveredPage);
  TestValidator.equals(
    "delivered tracking update exists",
    deliveredPage.data.length,
    3,
  );
  TestValidator.equals(
    "delivered status persisted",
    deliveredPage.data[2].tracking_status,
    "delivered",
  );
  // 6. Validate pagination response
  TestValidator.equals(
    "pagination current page is 1",
    deliveredPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is default",
    deliveredPage.pagination.limit,
    50,
  );
  TestValidator.equals(
    "pagination total records count",
    deliveredPage.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination total pages",
    deliveredPage.pagination.pages,
    1,
  );
}
