import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_shipments_create } from "../../../generate/generate_random_shopping_mall_member_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_confirmation } from "../../../prepare/prepare_random_shopping_mall_shipment_confirmation";

export async function test_api_shipment_update_reconfirm_updates_tracking_projection(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  const shipment = await generate_random_shopping_mall_member_shipments_create(
    memberConnection,
    {
      body: {
        shipment_confirmation: null,
      },
    },
  );
  typia.assert(shipment);
  const shipmentId = shipment.id;
  const firstConfirmedAt = RandomGenerator.date(
    new Date(),
    1000 * 60 * 60,
  ).toISOString();
  const secondConfirmedAt = RandomGenerator.date(
    new Date(),
    1000 * 60 * 60 * 2,
  ).toISOString();
  const firstTrackingUrl = typia.random<string & tags.Format<"url">>();
  const firstTrackingNumber = RandomGenerator.alphaNumeric(16);
  const firstCarrierName = RandomGenerator.name(2);
  const firstNote = RandomGenerator.paragraph({ sentences: 2 });
  const firstUpdateBody = {
    confirmation_type: "confirmed",
    confirmed_at: firstConfirmedAt,
    tracking_url: firstTrackingUrl,
    tracking_number: firstTrackingNumber,
    carrier_name: firstCarrierName,
    note: firstNote,
  } satisfies IShoppingMallShipment.IUpdate;
  const firstResponse =
    await api.functional.shoppingMall.member.shipments.updateShipment(
      memberConnection,
      {
        shipmentId,
        body: firstUpdateBody,
      },
    );
  typia.assert(firstResponse);
  TestValidator.predicate(
    "first response has tracking projection",
    firstResponse.tracking !== null,
  );
  if (firstResponse.tracking !== null) {
    TestValidator.equals(
      "tracking confirmationType is null per DTO",
      firstResponse.tracking.confirmationType,
      null,
    );
    TestValidator.equals(
      "tracking confirmedAt is null per DTO",
      firstResponse.tracking.confirmedAt,
      null,
    );
    TestValidator.equals(
      "tracking trackingUrl is null per DTO",
      firstResponse.tracking.trackingUrl,
      null,
    );
    TestValidator.equals(
      "tracking trackingNumber is null per DTO",
      firstResponse.tracking.trackingNumber,
      null,
    );
    TestValidator.equals(
      "tracking carrierName is null per DTO",
      firstResponse.tracking.carrierName,
      null,
    );
    TestValidator.equals(
      "tracking note is null per DTO",
      firstResponse.tracking.note,
      null,
    );
  }
  const secondTrackingUrl = typia.random<string & tags.Format<"url">>();
  const secondTrackingNumber = RandomGenerator.alphaNumeric(16);
  const secondCarrierName = RandomGenerator.name(2);
  const secondNote = RandomGenerator.paragraph({ sentences: 3 });
  const firstStatus = firstResponse.status;
  const secondUpdateBody = {
    confirmation_type: "confirmed",
    confirmed_at: secondConfirmedAt,
    tracking_url: secondTrackingUrl,
    tracking_number: secondTrackingNumber,
    carrier_name: secondCarrierName,
    note: secondNote,
  } satisfies IShoppingMallShipment.IUpdate;
  const secondResponse =
    await api.functional.shoppingMall.member.shipments.updateShipment(
      memberConnection,
      {
        shipmentId,
        body: secondUpdateBody,
      },
    );
  typia.assert(secondResponse);
  TestValidator.predicate(
    "second response has tracking projection",
    secondResponse.tracking !== null,
  );
  if (secondResponse.tracking !== null) {
    TestValidator.equals(
      "tracking confirmationType is null per DTO after re-confirm",
      secondResponse.tracking.confirmationType,
      null,
    );
    TestValidator.equals(
      "tracking confirmedAt is null per DTO after re-confirm",
      secondResponse.tracking.confirmedAt,
      null,
    );
    TestValidator.equals(
      "tracking trackingUrl is null per DTO after re-confirm",
      secondResponse.tracking.trackingUrl,
      null,
    );
    TestValidator.equals(
      "tracking trackingNumber is null per DTO after re-confirm",
      secondResponse.tracking.trackingNumber,
      null,
    );
    TestValidator.equals(
      "tracking carrierName is null per DTO after re-confirm",
      secondResponse.tracking.carrierName,
      null,
    );
    TestValidator.equals(
      "tracking note is null per DTO after re-confirm",
      secondResponse.tracking.note,
      null,
    );
  }
  TestValidator.equals(
    "shipment status remains consistent after re-confirm",
    secondResponse.status,
    firstStatus,
  );
}
