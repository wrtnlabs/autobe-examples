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

export async function test_api_shipment_tracking_tracking_context_lifecycle_and_consistency(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(memberAuth);
  const trackingGetter = async (shipmentId: string & tags.Format<"uuid">) => {
    const response =
      await api.functional.shoppingMall.member.shipments.tracking.at(
        memberConnection,
        {
          shipmentId,
        },
      );
    typia.assert(response);
    return response;
  };
  // 2) Create a shipment without active confirmation
  const shipment = await generate_random_shopping_mall_member_shipments_create(
    memberConnection,
    {
      body: {
        shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_order_item_ids: [
          typia.random<string & tags.Format<"uuid">>(),
        ],
        shipment_confirmation: null,
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  const first = await trackingGetter(shipment.id);
  TestValidator.equals("shipment ids match", first.id, shipment.id);
  TestValidator.equals(
    "tracking should be null before confirmation",
    first.tracking,
    null,
  );
  // 3) Confirm shipment with tracking details
  const confirmation: IShoppingMallShipmentConfirmation.ICreate = {
    shoppingMallShipmentId: shipment.id,
    confirmationType: RandomGenerator.alphabets(12),
    confirmedAt: new Date().toISOString(),
    trackingUrl: "https://example.com/tracking" satisfies string &
      tags.Format<"url">,
    trackingNumber: RandomGenerator.alphabets(10),
    carrierName: RandomGenerator.alphabets(8),
    note: RandomGenerator.paragraph({ sentences: 2 }),
  };
  await generate_random_shopping_mall_member_shipments_confirmations_create(
    memberConnection,
    {
      params: { shipmentId: shipment.id },
      body: confirmation,
    },
  );
  // 4) Fetch tracking again and validate derived from active confirmation
  const second = await trackingGetter(shipment.id);
  TestValidator.equals("shipment ids match", second.id, shipment.id);
  TestValidator.predicate(
    "tracking should exist after confirmation",
    second.tracking !== null,
  );
}
