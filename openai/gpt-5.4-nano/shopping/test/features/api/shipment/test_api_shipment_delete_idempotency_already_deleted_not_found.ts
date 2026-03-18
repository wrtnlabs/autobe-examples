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
import { generate_random_shopping_mall_member_shipments_create } from "../../../generate/generate_random_shopping_mall_member_shipments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_confirmation } from "../../../prepare/prepare_random_shopping_mall_shipment_confirmation";

export async function test_api_shipment_delete_idempotency_already_deleted_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as member
  const memberConnectionBase: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnectionBase, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: authorized.token.access,
  };

  // 2) Create order for the member
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {
      body: {},
    } satisfies DeepPartial<
      {
        body?: {
          shopping_mall_payment_id?: string & tags.Format<"uuid">;
          ship_to_name?: string;
          ship_to_phone?: string;
          ship_to_postal_code?: string;
          ship_to_region?: string;
          ship_to_city?: string;
          ship_to_street_address?: string;
          ship_to_detail_address?: string;
          shipping_instructions?: string | null;
        };
      }
    >,
  );
  typia.assert(order);

  // 3) Create shipment inside the order
  const orderItemIds: Array<string & tags.Format<"uuid">> =
    order.orderItems.map((x) => x.id);
  const shipment = await generate_random_shopping_mall_member_shipments_create(
    memberConnection,
    {
      body: {
        shopping_mall_order_id: order.id,
        shopping_mall_order_item_ids: orderItemIds,
        shipment_confirmation: null,
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  const shipmentId = shipment.id;

  // 4) First delete should succeed
  await api.functional.shoppingMall.member.shipments.erase(memberConnection, {
    shipmentId,
  });

  // 5) GET after delete should be not found
  await TestValidator.httpError(
    "shipment should not be retrievable after deletion",
    404,
    async () =>
      await api.functional.shoppingMall.member.shipments.at(memberConnection, {
        shipmentId,
      }),
  );

  // 6) Tracking after delete should be not found
  await TestValidator.httpError(
    "shipment tracking should not be accessible after deletion",
    404,
    async () =>
      await api.functional.shoppingMall.member.shipments.tracking.at(
        memberConnection,
        { shipmentId },
      ),
  );

  // 7) Second delete should be rejected as not found
  await TestValidator.httpError(
    "second delete of already deleted shipment should be not found",
    404,
    async () =>
      await api.functional.shoppingMall.member.shipments.erase(
        memberConnection,
        {
          shipmentId,
        },
      ),
  );

  // 8) Ensure the shipment remains unavailable
  await TestValidator.httpError(
    "shipment remains not retrievable after second delete attempt",
    404,
    async () =>
      await api.functional.shoppingMall.member.shipments.at(memberConnection, {
        shipmentId,
      }),
  );
  await TestValidator.httpError(
    "tracking remains inaccessible after second delete attempt",
    404,
    async () =>
      await api.functional.shoppingMall.member.shipments.tracking.at(
        memberConnection,
        { shipmentId },
      ),
  );
}
