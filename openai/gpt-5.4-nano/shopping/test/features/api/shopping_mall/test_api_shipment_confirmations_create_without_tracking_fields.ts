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
import { generate_random_shopping_mall_member_shipments_confirmations_create } from "../../../generate/generate_random_shopping_mall_member_shipments_confirmations_create";
import { generate_random_shopping_mall_member_shipments_create } from "../../../generate/generate_random_shopping_mall_member_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_confirmation } from "../../../prepare/prepare_random_shopping_mall_shipment_confirmation";

export async function test_api_shipment_confirmations_create_without_tracking_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member authorization
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });

  // actor-specific connection for authenticated calls
  const actorConnection: api.IConnection = { host: connection.host };
  actorConnection.headers = memberConnection.headers;

  // 2) Create an eligible shipment and capture shipmentId
  // TS2554 fix: the generator expects 2 arguments (connection, input/option)
  const shipment = await generate_random_shopping_mall_member_shipments_create(
    actorConnection,
    {
      body: prepare_random_shopping_mall_shipment(),
    } as any,
  );
  typia.assert(shipment);

  // 3) Submit confirmation with explicit null tracking fields
  const confirmedAt = RandomGenerator.date(
    new Date(),
    1000 * 60 * 60,
  ).toISOString();
  const confirmationType = RandomGenerator.alphabets(10);
  const confirmation =
    await generate_random_shopping_mall_member_shipments_confirmations_create(
      actorConnection,
      {
        params: { shipmentId: shipment.id },
        body: {
          shoppingMallShipmentId: shipment.id,
          confirmationType,
          confirmedAt,
          trackingUrl: null,
          trackingNumber: null,
          carrierName: null,
          note: null,
        } satisfies IShoppingMallShipmentConfirmation.ICreate,
      },
    );
  typia.assert(confirmation);

  // 4) Validate persisted state via response
  TestValidator.equals(
    "confirmation bound to shipmentId",
    confirmation.shopping_mall_shipment_id,
    shipment.id,
  );
  TestValidator.equals(
    "confirmationType matches",
    confirmation.confirmation_type,
    confirmationType,
  );
  TestValidator.equals("trackingUrl is null", confirmation.tracking_url, null);
  TestValidator.equals(
    "trackingNumber is null",
    confirmation.tracking_number,
    null,
  );
  TestValidator.equals("carrierName is null", confirmation.carrier_name, null);
  TestValidator.equals("note is null", confirmation.note, null);
}
