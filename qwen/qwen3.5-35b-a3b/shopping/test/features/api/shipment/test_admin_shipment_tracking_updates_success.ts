import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_admin_shipment_tracking_updates_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin account
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinResult = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: (typia.random<string & tags.Format<"email">>()),
      password: adminPassword,
      href: (typia.random<string & tags.Format<"uri">>()),
      referrer: (typia.random<string & tags.Format<"uri">>()),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminJoinResult);
  // 2. Seller setup - create seller account
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinResult = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: (typia.random<string & tags.Format<"email">>()),
      password: sellerPassword,
      href: (typia.random<string & tags.Format<"uri">>()),
      referrer: (typia.random<string & tags.Format<"uri">>()),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerJoinResult);
  // 3. Authenticate both actors
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoinResult.email,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoinResult.email,
      password: sellerPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 4. Seller creates a shipment with valid order items
  // Note: This assumes valid order_item_ids exist in the test database with 'paid' status
  const orderItemIds: string[] = ArrayUtil.repeat(2, () =>
    (typia.random<string & tags.Format<"uuid">>()),
  );
  const shipment = await api.functional.ecommerceMall.seller.shipments.create(
    sellerConnection,
    {
      body: {
        order_item_ids: orderItemIds,
        carrier_name: RandomGenerator.alphabets(8),
        carrier_phone: RandomGenerator.mobile(),
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 5. First tracking update - change status to 'in_transit'
  const firstUpdateResult =
    await api.functional.ecommerceMall.admin.shipments.tracking_updates.updateTrackingUpdates(
      adminConnection,
      {
        shipmentId: shipment.id,
        body: {
          tracking_status: "in_transit",
        } satisfies IEcommerceMallShipmentTrackingUpdate.IRequest,
      },
    );
  typia.assert(firstUpdateResult);
  TestValidator.equals(
    "tracking updates count after first update",
    firstUpdateResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "tracking status after first update",
    firstUpdateResult.data[0].tracking_status,
    "in_transit",
  );
  const firstUpdatedAt = firstUpdateResult.data[0].created_at;
  // Wait a moment to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 6. Second tracking update - change status to 'delivered'
  const secondUpdateResult =
    await api.functional.ecommerceMall.admin.shipments.tracking_updates.updateTrackingUpdates(
      adminConnection,
      {
        shipmentId: shipment.id,
        body: {
          tracking_status: "delivered",
        } satisfies IEcommerceMallShipmentTrackingUpdate.IRequest,
      },
    );
  typia.assert(secondUpdateResult);
  TestValidator.equals(
    "tracking updates count after second update",
    secondUpdateResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "tracking status after second update",
    secondUpdateResult.data[0].tracking_status,
    "delivered",
  );
  TestValidator.notEquals(
    "timestamp updated after second update",
    firstUpdatedAt,
    secondUpdateResult.data[0].created_at,
  );
  // 7. Validate shipment's delivered_at is set when tracking status becomes 'delivered'
  TestValidator.equals(
    "shipment delivered_at should be set after delivered status",
    shipment.deliveredAt !== undefined,
    true,
  );
  TestValidator.equals(
    "shipment delivered_at should not be null",
    shipment.deliveredAt !== null,
    true,
  );
}