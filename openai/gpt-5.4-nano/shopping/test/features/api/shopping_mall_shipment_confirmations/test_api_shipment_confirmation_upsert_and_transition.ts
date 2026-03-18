import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentConfirmation";
import type { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_order_items_create } from "../../../generate/generate_random_shopping_mall_member_order_items_create";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_shipments_create } from "../../../generate/generate_random_shopping_mall_member_shipments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_confirmation } from "../../../prepare/prepare_random_shopping_mall_shipment_confirmation";

export async function test_api_shipment_confirmation_upsert_and_transition(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate member
  const baseConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const joined = await authorize_member_join(baseConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(joined);
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers ??= {};
  memberConnection.headers.Authorization = joined.token.access;
  // 2) Create an order
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {},
  );
  typia.assert(order);
  // 3) Create at least one order item
  const createOrderItemBody = prepare_random_shopping_mall_order_item({
    shopping_mall_order_id: order.id,
  });
  const orderItem1 =
    await generate_random_shopping_mall_member_order_items_create(
      memberConnection,
      {
        body: createOrderItemBody satisfies IShoppingMallOrderItem.ICreate,
      },
    );
  typia.assert(orderItem1);
  // 4) Create shipment grouping including the order item
  const shipment = await generate_random_shopping_mall_member_shipments_create(
    memberConnection,
    {
      body: {
        shopping_mall_order_id: order.id,
        shopping_mall_order_item_ids: [orderItem1.id],
        shipment_confirmation: null,
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // Basic linkage sanity
  TestValidator.equals(
    "order item linked to shipment",
    orderItem1.shoppingMallShipmentId,
    shipment.id,
  );
  // 5) Submit shipment confirmation (create)
  const confirmationType = "shipped";
  const confirmedAt1 = new Date().toISOString();
  const trackingUrl1 = typia.random<string & tags.Format<"url">>();
  const trackingNumber1 = RandomGenerator.alphaNumeric(14);
  const carrierName1 = RandomGenerator.name();
  const note1 = RandomGenerator.paragraph({ sentences: 2 });
  const confirmation1 =
    await api.functional.shoppingMall.member.shipment_confirmations.submitShipmentConfirmation(
      memberConnection,
      {
        body: {
          shoppingMallShipmentId: shipment.id,
          confirmationType,
          confirmedAt: confirmedAt1,
          trackingUrl: trackingUrl1,
          trackingNumber: trackingNumber1,
          carrierName: carrierName1,
          note: note1,
        } satisfies IShoppingMallShipmentConfirmation.IRequest,
      },
    );
  typia.assert(confirmation1);
  // 6) Validate response fields
  TestValidator.equals(
    "confirmation shipment id",
    confirmation1.shopping_mall_shipment_id,
    shipment.id,
  );
  TestValidator.equals(
    "confirmation type",
    confirmation1.confirmation_type,
    confirmationType,
  );
  TestValidator.equals(
    "confirmation confirmed_at",
    confirmation1.confirmed_at,
    confirmedAt1,
  );
  TestValidator.equals(
    "tracking url",
    confirmation1.tracking_url,
    trackingUrl1,
  );
  TestValidator.equals(
    "tracking number",
    confirmation1.tracking_number,
    trackingNumber1,
  );
  TestValidator.equals(
    "carrier name",
    confirmation1.carrier_name,
    carrierName1,
  );
  TestValidator.equals("note", confirmation1.note, note1);
  // 7) Upsert/idempotency: submit again with same type, different tracking/note/confirmedAt
  const confirmedAt2 = new Date(Date.now() + 1000).toISOString();
  const trackingUrl2 = typia.random<string & tags.Format<"url">>();
  const trackingNumber2 = RandomGenerator.alphaNumeric(14);
  const carrierName2 = RandomGenerator.name();
  const note2 = RandomGenerator.paragraph({ sentences: 2 });
  const confirmation2 =
    await api.functional.shoppingMall.member.shipment_confirmations.submitShipmentConfirmation(
      memberConnection,
      {
        body: {
          shoppingMallShipmentId: shipment.id,
          confirmationType,
          confirmedAt: confirmedAt2,
          trackingUrl: trackingUrl2,
          trackingNumber: trackingNumber2,
          carrierName: carrierName2,
          note: note2,
        } satisfies IShoppingMallShipmentConfirmation.IRequest,
      },
    );
  typia.assert(confirmation2);
  TestValidator.equals(
    "upsert still same shipment id",
    confirmation2.shopping_mall_shipment_id,
    shipment.id,
  );
  TestValidator.equals(
    "upsert same confirmation type",
    confirmation2.confirmation_type,
    confirmationType,
  );
  TestValidator.equals(
    "upsert confirmed_at updated",
    confirmation2.confirmed_at,
    confirmedAt2,
  );
  TestValidator.equals(
    "upsert tracking url updated",
    confirmation2.tracking_url,
    trackingUrl2,
  );
  TestValidator.equals(
    "upsert tracking number updated",
    confirmation2.tracking_number,
    trackingNumber2,
  );
  TestValidator.equals(
    "upsert carrier name updated",
    confirmation2.carrier_name,
    carrierName2,
  );
  TestValidator.equals("upsert note updated", confirmation2.note, note2);
}
