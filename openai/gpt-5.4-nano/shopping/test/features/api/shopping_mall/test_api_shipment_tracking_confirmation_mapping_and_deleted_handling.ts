import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentConfirmation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_shipments_confirmations_create } from "../../../generate/generate_random_shopping_mall_member_shipments_confirmations_create";
import { generate_random_shopping_mall_member_shipments_create } from "../../../generate/generate_random_shopping_mall_member_shipments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_confirmation } from "../../../prepare/prepare_random_shopping_mall_shipment_confirmation";

export async function test_api_shipment_tracking_confirmation_mapping_and_deleted_handling(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoin = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberJoin);
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {},
  );
  typia.assert(order);
  // Scenario 1: shipment-level tracking returned from active confirmation
  const shipment1 = await generate_random_shopping_mall_member_shipments_create(
    memberConnection,
    {
      body: {
        shopping_mall_order_id: order.id,
      },
    },
  );
  typia.assert(shipment1);
  const confirmationBody1: IShoppingMallShipmentConfirmation.ICreate = {
    shoppingMallShipmentId: shipment1.id,
    confirmationType: typia.random<string>(),
    confirmedAt: new Date().toISOString(),
    trackingUrl: typia.random<string & tags.Format<"url">>(),
    trackingNumber: typia.random<string>(),
    carrierName: typia.random<string>(),
    note: typia.random<string>(),
  };
  const confirmation1 =
    await generate_random_shopping_mall_member_shipments_confirmations_create(
      memberConnection,
      {
        params: { shipmentId: shipment1.id },
        body: confirmationBody1,
      },
    );
  typia.assert(confirmation1);
  const tracking1 =
    await api.functional.shoppingMall.member.shipments.tracking.at(
      memberConnection,
      { shipmentId: shipment1.id },
    );
  typia.assert(tracking1);
  const expectedCarrierName = confirmation1.carrier_name;
  const expectedTrackingNumber = confirmation1.tracking_number;
  const expectedTrackingUrl = confirmation1.tracking_url;
  TestValidator.equals(
    "carrierName matches confirmation",
    tracking1.tracking === null ? null : tracking1.tracking.carrierName,
    (expectedCarrierName ?? undefined) as null | undefined,
  );
  TestValidator.equals(
    "trackingNumber matches confirmation",
    tracking1.tracking === null ? null : tracking1.tracking.trackingNumber,
    (expectedTrackingNumber ?? undefined) as null | undefined,
  );
  TestValidator.equals(
    "trackingUrl matches confirmation",
    tracking1.tracking === null ? null : tracking1.tracking.trackingUrl,
    (expectedTrackingUrl ?? undefined) as null | undefined,
  );
  // Scenario 2: null confirmation tracking fields are preserved
  const shipment2 = await generate_random_shopping_mall_member_shipments_create(
    memberConnection,
    {
      body: {
        shopping_mall_order_id: order.id,
      },
    },
  );
  typia.assert(shipment2);
  const confirmationBody2: IShoppingMallShipmentConfirmation.ICreate = {
    shoppingMallShipmentId: shipment2.id,
    confirmationType: typia.random<string>(),
    confirmedAt: new Date().toISOString(),
    trackingUrl: null,
    trackingNumber: typia.random<string>(),
    carrierName: null,
    note: typia.random<string>(),
  };
  const confirmation2 =
    await generate_random_shopping_mall_member_shipments_confirmations_create(
      memberConnection,
      {
        params: { shipmentId: shipment2.id },
        body: confirmationBody2,
      },
    );
  typia.assert(confirmation2);
  const tracking2 =
    await api.functional.shoppingMall.member.shipments.tracking.at(
      memberConnection,
      { shipmentId: shipment2.id },
    );
  typia.assert(tracking2);
  TestValidator.equals(
    "non-null trackingNumber matches confirmation",
    tracking2.tracking === null ? null : tracking2.tracking.trackingNumber,
    (confirmation2.tracking_number ?? undefined) as null | undefined,
  );
  TestValidator.equals(
    "null trackingUrl preserved",
    tracking2.tracking === null ? null : tracking2.tracking.trackingUrl,
    (confirmation2.tracking_url ?? undefined) as null | undefined,
  );
  TestValidator.equals(
    "null carrierName preserved",
    tracking2.tracking === null ? null : tracking2.tracking.carrierName,
    (confirmation2.carrier_name ?? undefined) as null | undefined,
  );
  // Scenario 3: deleted shipment behaves as not found
  const shipment3 = await generate_random_shopping_mall_member_shipments_create(
    memberConnection,
    {
      body: {
        shopping_mall_order_id: order.id,
      },
    },
  );
  typia.assert(shipment3);
  await generate_random_shopping_mall_member_shipments_confirmations_create(
    memberConnection,
    {
      params: { shipmentId: shipment3.id },
      body: {
        shoppingMallShipmentId: shipment3.id,
        confirmationType: typia.random<string>(),
        confirmedAt: new Date().toISOString(),
        trackingUrl: typia.random<string & tags.Format<"url">>(),
        trackingNumber: typia.random<string>(),
        carrierName: typia.random<string>(),
        note: typia.random<string>(),
      } satisfies IShoppingMallShipmentConfirmation.ICreate,
    },
  );
  await api.functional.shoppingMall.member.shipments.erase(memberConnection, {
    shipmentId: shipment3.id,
  });
  await TestValidator.httpError(
    "deleted shipment tracking should be not found",
    404,
    async () => {
      await api.functional.shoppingMall.member.shipments.tracking.at(
        memberConnection,
        { shipmentId: shipment3.id },
      );
    },
  );
}
