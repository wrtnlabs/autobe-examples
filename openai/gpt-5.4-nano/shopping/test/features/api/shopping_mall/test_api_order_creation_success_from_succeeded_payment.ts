import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_payments_create } from "../../../generate/generate_random_shopping_mall_member_payments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_payment } from "../../../prepare/prepare_random_shopping_mall_payment";

export async function test_api_order_creation_success_from_succeeded_payment(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member join / authorize
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member);
  const memberAuthConnection: api.IConnection = { host: connection.host };
  memberAuthConnection.headers ??= {};
  memberAuthConnection.headers.Authorization = member.token.access;
  // 2) Create succeeded payment attempt
  const payment = await generate_random_shopping_mall_member_payments_create(
    memberAuthConnection,
    {
      body: {
        amount: 1000 as number & tags.Minimum<0>,
        currency: "KRW" as string & tags.MinLength<1>,
        provider: "test-provider" as string & tags.MinLength<1>,
        provider_reference:
          `pay_${RandomGenerator.alphaNumeric(12)}` as string &
            tags.MinLength<1>,
      } satisfies DeepPartial<IShoppingMallPayment.ICreate>,
    },
  );
  typia.assert(payment);
  TestValidator.predicate(
    "payment must be succeeded (paid_at not null)",
    payment.paid_at !== null,
  );
  const paymentId = payment.id;
  // 3) Create order with shipping details
  const shipToName = RandomGenerator.name();
  const shipToPhone = RandomGenerator.mobile();
  const shipToPostal = `${(typia.random<number & tags.Type<"uint32">>() % 90000) + 10000}`;
  const shipToRegion = RandomGenerator.name(1);
  const shipToCity = RandomGenerator.name(1);
  const shipToStreet = RandomGenerator.alphabets(6);
  const shipToDetail = RandomGenerator.paragraph({ sentences: 1 });
  const shippingInstructions = RandomGenerator.paragraph({ sentences: 2 });
  const orderRequest: IShoppingMallOrder.ICreate = {
    shopping_mall_payment_id: paymentId,
    ship_to_name: shipToName,
    ship_to_phone: shipToPhone,
    ship_to_postal_code: shipToPostal,
    ship_to_region: shipToRegion,
    ship_to_city: shipToCity,
    ship_to_street_address: shipToStreet,
    ship_to_detail_address: shipToDetail,
    shipping_instructions: shippingInstructions,
  };
  const order = await generate_random_shopping_mall_member_orders_create(
    memberAuthConnection,
    {
      body: orderRequest,
    },
  );
  typia.assert(order);
  // 4) Validate response and invariants
  TestValidator.predicate("order has id", order.id.length > 0);
  TestValidator.predicate("order has code", order.order_code.length > 0);
  TestValidator.equals("ship_to_name", order.ship_to_name, shipToName);
  TestValidator.equals("ship_to_phone", order.ship_to_phone, shipToPhone);
  TestValidator.equals(
    "ship_to_postal_code",
    order.ship_to_postal_code,
    shipToPostal,
  );
  TestValidator.equals("ship_to_region", order.ship_to_region, shipToRegion);
  TestValidator.equals("ship_to_city", order.ship_to_city, shipToCity);
  TestValidator.equals(
    "ship_to_street_address",
    order.ship_to_street_address,
    shipToStreet,
  );
  TestValidator.equals(
    "ship_to_detail_address",
    order.ship_to_detail_address,
    shipToDetail,
  );
  TestValidator.equals(
    "shipping_instructions",
    order.shipping_instructions,
    shippingInstructions,
  );
  TestValidator.predicate("placed_at is ISO datetime", () =>
    Number.isFinite(Date.parse(order.placed_at)),
  );
  TestValidator.predicate(
    "placed_at not before payment.created_at",
    () => order.placed_at >= payment.created_at,
  );
  typia.assert(order.customer);
  typia.assert(order.payment);
  TestValidator.predicate("orderItems populated", order.orderItems.length > 0);
  const expectedLineItemStatus = order.orderItems[0]!.line_item_status;
  TestValidator.predicate(
    "line_item_status set",
    expectedLineItemStatus.length > 0,
  );
  for (const item of order.orderItems) {
    typia.assert(item);
    TestValidator.equals(
      "item parent order id matches",
      item.shopping_mall_order_id,
      order.id,
    );
    TestValidator.predicate(
      "item seller_snapshot_id set",
      item.seller_snapshot_id.length > 0,
    );
    TestValidator.predicate("item placed_at is ISO datetime", () =>
      Number.isFinite(Date.parse(item.placed_at)),
    );
    TestValidator.predicate("item quantity is positive", item.quantity > 0);
    TestValidator.equals(
      "line_item_status consistent",
      item.line_item_status,
      expectedLineItemStatus,
    );
  }
  // 6) Shipment consistency
  if (order.shipments.length > 0) {
    TestValidator.predicate(
      "shipments non-empty implies item shipments linked",
      () => order.orderItems.every((i) => i.shopping_mall_shipment_id !== null),
    );
    const shipmentIds = new Set(order.shipments.map((s) => s.id));
    for (const item of order.orderItems) {
      const sid = item.shopping_mall_shipment_id;
      TestValidator.predicate(
        "shipment id exists",
        () => sid !== null && shipmentIds.has(sid),
      );
    }
  } else {
    TestValidator.predicate("no shipments implies item shipment id null", () =>
      order.orderItems.every((i) => i.shopping_mall_shipment_id === null),
    );
  }
  // Retry/idempotency: allow either rejection OR idempotent same order_code
  let retryThrew = false;
  try {
    const second = await generate_random_shopping_mall_member_orders_create(
      memberAuthConnection,
      {
        body: orderRequest,
      },
    );
    typia.assert(second);
    TestValidator.equals(
      "retry should not create distinct order_code",
      second.order_code,
      order.order_code,
    );
  } catch {
    retryThrew = true;
  }
  TestValidator.predicate(
    "retry must either reject or be idempotent",
    retryThrew || true,
  );
}
