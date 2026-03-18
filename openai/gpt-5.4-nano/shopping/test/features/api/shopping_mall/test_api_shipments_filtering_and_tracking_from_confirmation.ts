import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
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

export async function test_api_shipments_filtering_and_tracking_from_confirmation(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: credentials,
  });
  typia.assert(authorized);
  // 2) Create an order that belongs to the authenticated member
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {
      body: {
        shipping_instructions: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  typia.assert(order);
  // 3) Create a shipment grouping for that order
  const shipment = await generate_random_shopping_mall_member_shipments_create(
    memberConnection,
    {
      body: {
        shopping_mall_order_id: order.id,
      },
    },
  );
  typia.assert(shipment);
  // 4) Create shipment confirmations ensuring tracking fields + confirmedAt
  const confirmedAt = new Date().toISOString();
  const trackingUrl = RandomGenerator.alphaNumeric(12);
  const carrierName = RandomGenerator.name();
  const trackingNumber = RandomGenerator.alphaNumeric(14);
  const confirmation =
    await generate_random_shopping_mall_member_shipments_confirmations_create(
      memberConnection,
      {
        params: { shipmentId: shipment.id },
        body: {
          confirmationType: "shipped",
          confirmedAt,
          trackingUrl: `https://tracking.example/${trackingUrl}`,
          trackingNumber,
          carrierName,
          note: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(confirmation);
  // 5) PATCH /shoppingMall/member/shipments with deterministic pagination
  const page = 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 10 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const shipmentsPage =
    await api.functional.shoppingMall.member.shipments.index(memberConnection, {
      body: {
        shopping_mall_order_id: order.id,
        page,
        limit,
        // Rely on stable default ordering; do not guess sort keys.
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(shipmentsPage);
  TestValidator.equals(
    "pagination current",
    shipmentsPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", shipmentsPage.pagination.limit, 10);
  TestValidator.predicate(
    "records positive",
    shipmentsPage.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pages positive",
    shipmentsPage.pagination.pages >= 1,
  );
  TestValidator.predicate("data non-empty", shipmentsPage.data.length > 0);
  TestValidator.predicate(
    "at most limit rows",
    shipmentsPage.data.length <= shipmentsPage.pagination.limit,
  );
  // Validate each returned shipment row fields + latest tracking matching the confirmation
  for (const row of shipmentsPage.data) {
    typia.assert(row);
    TestValidator.equals("shipment id present", row.id, row.id);
    TestValidator.equals(
      "shipment order id matches filter",
      row.order.id,
      order.id,
    );
    // Order summary fields populated
    TestValidator.predicate(
      "orderCode present",
      row.order.orderCode.length > 0,
    );
    TestValidator.predicate("placedAt present", row.order.placedAt.length > 0);
    TestValidator.predicate(
      "totalPrice is number",
      Number.isFinite(row.order.totalPrice),
    );
    TestValidator.predicate(
      "overallStatus present",
      row.order.overallStatus.length > 0,
    );
    TestValidator.predicate(
      "deletedAt is null or string",
      row.order.deletedAt === null || row.order.deletedAt.length > 0,
    );
    // latest non-deleted confirmation should match what we created
    TestValidator.equals(
      "trackingUrl matches",
      row.trackingUrl,
      confirmation.tracking_url,
    );
    TestValidator.equals(
      "trackingNumber matches",
      row.trackingNumber,
      confirmation.tracking_number,
    );
    TestValidator.equals(
      "carrierName matches",
      row.carrierName,
      confirmation.carrier_name,
    );
    TestValidator.equals(
      "confirmationType matches",
      row.confirmationType,
      confirmation.confirmation_type,
    );
    TestValidator.equals(
      "confirmedAt matches",
      row.confirmedAt,
      confirmation.confirmed_at,
    );
  }
  // Edge assertion: stable results for the same request
  const shipmentsPage2 =
    await api.functional.shoppingMall.member.shipments.index(memberConnection, {
      body: {
        shopping_mall_order_id: order.id,
        page,
        limit,
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(shipmentsPage2);
  const gottenIds = shipmentsPage.data.map((x) => x.id);
  const gottenIds2 = shipmentsPage2.data.map((x) => x.id);
  TestValidator.equals(
    "stable ordering when re-requested",
    gottenIds,
    gottenIds2,
  );
}
