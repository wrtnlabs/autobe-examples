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

export async function test_api_order_creation_shipping_captured_at_placement(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join a new member.
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member);
  // 2) Initiate a successful payment attempt.
  const payment = await generate_random_shopping_mall_member_payments_create(
    memberConnection,
    {
      body: {
        // orderPlacementContextId is required by DTO.
        orderPlacementContextId: typia.random<string & tags.Format<"uuid">>(),
        // Ensure >= 0 to satisfy DTO Minimum<0>.
        amount: typia.random<number & tags.Minimum<0>>(),
        currency: "USD" satisfies string,
        provider: RandomGenerator.alphaNumeric(10),
        provider_reference: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallPayment.ICreate,
    },
  );
  typia.assert(payment);
  TestValidator.predicate(
    "payment should be succeeded (paid_at present)",
    payment.paid_at !== null,
  );
  // 3) Create an order with explicit captured shipping values.
  const shipTo1 = {
    ship_to_name: RandomGenerator.name(2),
    ship_to_phone: RandomGenerator.mobile(),
    ship_to_postal_code: RandomGenerator.alphabets(5),
    ship_to_region: RandomGenerator.alphabets(6),
    ship_to_city: RandomGenerator.alphabets(6),
    ship_to_street_address: RandomGenerator.alphabets(10),
    ship_to_detail_address: RandomGenerator.alphabets(12),
    shipping_instructions: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies Omit<IShoppingMallOrder.ICreate, "shopping_mall_payment_id">;
  const order1 = await api.functional.shoppingMall.member.orders.create(
    memberConnection,
    {
      body: {
        shopping_mall_payment_id: payment.id,
        ...shipTo1,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order1);
  // 4) Validate captured data integrity.
  TestValidator.equals(
    "ship_to_name preserved",
    order1.ship_to_name,
    shipTo1.ship_to_name,
  );
  TestValidator.equals(
    "ship_to_phone preserved",
    order1.ship_to_phone,
    shipTo1.ship_to_phone,
  );
  TestValidator.equals(
    "ship_to_postal_code preserved",
    order1.ship_to_postal_code,
    shipTo1.ship_to_postal_code,
  );
  TestValidator.equals(
    "ship_to_region preserved",
    order1.ship_to_region,
    shipTo1.ship_to_region,
  );
  TestValidator.equals(
    "ship_to_city preserved",
    order1.ship_to_city,
    shipTo1.ship_to_city,
  );
  TestValidator.equals(
    "ship_to_street_address preserved",
    order1.ship_to_street_address,
    shipTo1.ship_to_street_address,
  );
  TestValidator.equals(
    "ship_to_detail_address preserved",
    order1.ship_to_detail_address,
    shipTo1.ship_to_detail_address,
  );
  TestValidator.equals(
    "shipping_instructions preserved",
    order1.shipping_instructions,
    shipTo1.shipping_instructions ?? null,
  );
  TestValidator.predicate(
    "placed_at exists",
    typeof order1.placed_at === "string" && order1.placed_at.length > 0,
  );
  // 5) Validate order-item snapshot linkage and purchase context.
  TestValidator.predicate("orderItems not empty", order1.orderItems.length > 0);
  const lineStatuses = new Set(
    order1.orderItems.map((x) => x.line_item_status),
  );
  TestValidator.predicate(
    "line_item_status initialized",
    Array.from(lineStatuses).every((s) => s.length > 0),
  );
  for (const item of order1.orderItems) {
    TestValidator.predicate(
      "seller_snapshot_id present",
      item.seller_snapshot_id.length > 0,
    );
    TestValidator.predicate(
      "seller_price_at_purchase non-negative",
      item.seller_price_at_purchase >= 0,
    );
    TestValidator.predicate("quantity positive", item.quantity > 0);
  }
  // Edge: attempt to create order again with same payment id but different shipping.
  const shipTo2 = {
    ship_to_name: RandomGenerator.name(2),
    ship_to_phone: RandomGenerator.mobile(),
    ship_to_postal_code: RandomGenerator.alphabets(5),
    ship_to_region: RandomGenerator.alphabets(6),
    ship_to_city: RandomGenerator.alphabets(6),
    ship_to_street_address: RandomGenerator.alphabets(10),
    ship_to_detail_address: RandomGenerator.alphabets(12),
    shipping_instructions: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies Omit<IShoppingMallOrder.ICreate, "shopping_mall_payment_id">;
  let order2: IShoppingMallOrder | undefined;
  let thrown: unknown;
  try {
    order2 = await api.functional.shoppingMall.member.orders.create(
      memberConnection,
      {
        body: {
          shopping_mall_payment_id: payment.id,
          ...shipTo2,
        } satisfies IShoppingMallOrder.ICreate,
      },
    );
    typia.assert(order2);
  } catch (err) {
    thrown = err;
  }
  // Accept either rejection (throw) OR idempotent return of original captured fields.
  if (order2) {
    TestValidator.equals(
      "duplicate creation returns same order_code",
      order2.order_code,
      order1.order_code,
    );
    TestValidator.equals(
      "ship_to_name not replaced",
      order2.ship_to_name,
      shipTo1.ship_to_name,
    );
    TestValidator.equals(
      "ship_to_phone not replaced",
      order2.ship_to_phone,
      shipTo1.ship_to_phone,
    );
    TestValidator.equals(
      "ship_to_postal_code not replaced",
      order2.ship_to_postal_code,
      shipTo1.ship_to_postal_code,
    );
    TestValidator.equals(
      "ship_to_region not replaced",
      order2.ship_to_region,
      shipTo1.ship_to_region,
    );
    TestValidator.equals(
      "ship_to_city not replaced",
      order2.ship_to_city,
      shipTo1.ship_to_city,
    );
    TestValidator.equals(
      "ship_to_street_address not replaced",
      order2.ship_to_street_address,
      shipTo1.ship_to_street_address,
    );
    TestValidator.equals(
      "ship_to_detail_address not replaced",
      order2.ship_to_detail_address,
      shipTo1.ship_to_detail_address,
    );
    TestValidator.equals(
      "shipping_instructions not replaced",
      order2.shipping_instructions,
      shipTo1.shipping_instructions ?? null,
    );
  } else {
    TestValidator.predicate(
      "duplicate creation should reject or be idempotent",
      thrown !== undefined,
    );
  }
  // Final check: first order kept its captured fields.
  TestValidator.equals(
    "first order ship_to_name unchanged",
    order1.ship_to_name,
    shipTo1.ship_to_name,
  );
}
