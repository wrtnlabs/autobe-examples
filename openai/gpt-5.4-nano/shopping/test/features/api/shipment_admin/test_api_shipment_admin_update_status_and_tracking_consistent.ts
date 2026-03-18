import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentConfirmation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_shipments_create } from "../../../generate/generate_random_shopping_mall_member_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_confirmation } from "../../../prepare/prepare_random_shopping_mall_shipment_confirmation";

export async function test_api_shipment_admin_update_status_and_tracking_consistent(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallAdmin.ILogin;
  await authorize_admin_login(adminConnection, {
    body: adminCreds,
  });
  // 2) Member setup (create member account)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallMember.IJoin;
  await authorize_member_join(memberConnection, {
    body: memberCreds,
  });
  // 3) Create shipment for the member (gets an existing shipmentId)
  const shipment = await generate_random_shopping_mall_member_shipments_create(
    memberConnection,
    {
      body: {
        // No DTO fields are provided in scenario plan; generate defaults.
      },
    },
  );
  typia.assert(shipment);
  // Ensure we can update this shipment
  const shipmentId = shipment.id;
  // 4) First admin update: update status and submit confirmation/tracking
  const firstUpdateConfirmationType: string = RandomGenerator.alphabets(10);
  const firstConfirmedAt: string = RandomGenerator.paragraph({
    sentences: 1,
  });
  const firstConfirmedAtIso = new Date().toISOString() satisfies string &
    tags.Format<"date-time">;
  const firstTrackingUrl =
    `https://tracking.example/${RandomGenerator.alphabets(8)}` satisfies string &
      tags.Format<"url">;
  const firstTrackingNumber = RandomGenerator.alphaNumeric(12);
  const firstCarrierName = RandomGenerator.alphabets(8);
  const firstNote = RandomGenerator.paragraph({ sentences: 2 });
  const firstStatus = `admin-status-${RandomGenerator.alphabets(6)}`;
  const firstRequestBody = {
    status: firstStatus,
    confirmation_type: firstUpdateConfirmationType,
    confirmed_at: firstConfirmedAtIso,
    tracking_url: firstTrackingUrl,
    tracking_number: firstTrackingNumber,
    carrier_name: firstCarrierName,
    note: firstNote,
  } satisfies IShoppingMallShipment.IUpdate;
  const firstResponse =
    await api.functional.shoppingMall.admin.admin.shipments.update(
      adminConnection,
      {
        shipmentId,
        body: firstRequestBody,
      },
    );
  typia.assert(firstResponse);
  // 5) Validate first response
  TestValidator.equals(
    "shipment status updated",
    firstResponse.status,
    firstStatus,
  );
  TestValidator.predicate(
    "tracking is not null after confirmation update",
    firstResponse.tracking !== null,
  );
  const firstTracking = typia.assert(firstResponse.tracking!);
  // NOTE: Provided DTO type for ITracking has `null` typed properties.
  // Validate structural expectations based on the DTO types.
  TestValidator.equals(
    "confirmationType derived value",
    firstTracking.confirmationType,
    null,
  );
  TestValidator.equals(
    "confirmedAt derived value",
    firstTracking.confirmedAt,
    null,
  );
  TestValidator.equals(
    "trackingUrl derived value",
    firstTracking.trackingUrl,
    null,
  );
  TestValidator.equals(
    "trackingNumber derived value",
    firstTracking.trackingNumber,
    null,
  );
  TestValidator.equals(
    "carrierName derived value",
    firstTracking.carrierName,
    null,
  );
  TestValidator.equals("note derived value", firstTracking.note, null);
  // 6) Second admin update: keep status same and update only tracking_number
  const secondTrackingNumber = RandomGenerator.alphaNumeric(14);
  const secondRequestBody: IShoppingMallShipment.IUpdate = {
    status: firstStatus,
    tracking_number: secondTrackingNumber,
  };
  const secondResponse =
    await api.functional.shoppingMall.admin.admin.shipments.update(
      adminConnection,
      {
        shipmentId,
        body: secondRequestBody,
      },
    );
  typia.assert(secondResponse);
  TestValidator.equals(
    "shipment status preserved",
    secondResponse.status,
    firstStatus,
  );
  TestValidator.predicate(
    "tracking remains not null",
    secondResponse.tracking !== null,
  );
  const secondTracking = typia.assert(secondResponse.tracking!);
  // Validate that confirmation-related fields remain unchanged (both are typed null)
  TestValidator.equals(
    "confirmationType preserved",
    secondTracking.confirmationType,
    firstTracking.confirmationType,
  );
  TestValidator.equals(
    "confirmedAt preserved",
    secondTracking.confirmedAt,
    firstTracking.confirmedAt,
  );
  // Validate tracking fields update (typed null; compare equality to null expectation)
  TestValidator.equals(
    "trackingNumber after partial update",
    secondTracking.trackingNumber,
    null,
  );
}
