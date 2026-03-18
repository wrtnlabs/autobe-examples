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
import type { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

export async function test_api_order_header_update_while_eligible(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });

  const created = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {},
  );
  typia.assert(created);

  const orderId = created.id;
  const placedAt = created.placed_at;
  const orderCode = created.order_code;

  const createdCustomer = typia.assert<{ id: string }>(
    created.customer as unknown,
  );
  const customerId = createdCustomer.id;

  const paymentId = created.payment.id;

  const before = await api.functional.shoppingMall.member.orders.at(
    memberConnection,
    { orderId },
  );
  typia.assert(before);

  const beforeUpdatedAt = before.updated_at;
  const beforeItemStatuses =
    await api.functional.shoppingMall.member.orders.order_items.status.orderItemsStatus(
      memberConnection,
      { orderId },
    );
  typia.assert(beforeItemStatuses);

  const newShipToName = RandomGenerator.name();
  const newShipToPhone = RandomGenerator.mobile();
  const newShipToPostalCode = RandomGenerator.alphabets(10);
  const newShipToRegion = RandomGenerator.alphabets(6);
  const newShipToCity = RandomGenerator.alphabets(8);
  const newShipToStreetAddress = RandomGenerator.paragraph({ sentences: 1 });
  const newShipToDetailAddress = RandomGenerator.paragraph({ sentences: 1 });
  const newShippingInstructions = RandomGenerator.paragraph({ sentences: 2 });

  const updated1 = await api.functional.shoppingMall.member.orders.update(
    memberConnection,
    {
      orderId,
      body: {
        ship_to_name: newShipToName,
        ship_to_phone: newShipToPhone,
        ship_to_postal_code: newShipToPostalCode,
        ship_to_region: newShipToRegion,
        ship_to_city: newShipToCity,
        ship_to_street_address: newShipToStreetAddress,
        ship_to_detail_address: newShipToDetailAddress,
        shipping_instructions: newShippingInstructions,
      } satisfies IShoppingMallOrder.IUpdate,
    },
  );
  typia.assert(updated1);

  TestValidator.equals("order_code unchanged", updated1.order_code, orderCode);
  TestValidator.equals("placed_at unchanged", updated1.placed_at, placedAt);

  const updated1Customer = typia.assert<{ id: string }>(
    updated1.customer as unknown,
  );
  TestValidator.equals(
    "customer id unchanged",
    updated1Customer.id,
    customerId,
  );
  TestValidator.equals("payment id unchanged", updated1.payment.id, paymentId);

  TestValidator.equals(
    "ship_to_name updated",
    updated1.ship_to_name,
    newShipToName,
  );
  TestValidator.equals(
    "ship_to_phone updated",
    updated1.ship_to_phone,
    newShipToPhone,
  );
  TestValidator.equals(
    "ship_to_postal_code updated",
    updated1.ship_to_postal_code,
    newShipToPostalCode,
  );
  TestValidator.equals(
    "ship_to_region updated",
    updated1.ship_to_region,
    newShipToRegion,
  );
  TestValidator.equals(
    "ship_to_city updated",
    updated1.ship_to_city,
    newShipToCity,
  );
  TestValidator.equals(
    "ship_to_street_address updated",
    updated1.ship_to_street_address,
    newShipToStreetAddress,
  );
  TestValidator.equals(
    "ship_to_detail_address updated",
    updated1.ship_to_detail_address,
    newShipToDetailAddress,
  );
  TestValidator.equals(
    "shipping_instructions updated",
    updated1.shipping_instructions,
    newShippingInstructions,
  );

  TestValidator.predicate(
    "updated_at later",
    updated1.updated_at > beforeUpdatedAt,
  );

  const updated2 = await api.functional.shoppingMall.member.orders.update(
    memberConnection,
    {
      orderId,
      body: {
        ship_to_name: newShipToName,
        ship_to_phone: newShipToPhone,
        ship_to_postal_code: newShipToPostalCode,
        ship_to_region: newShipToRegion,
        ship_to_city: newShipToCity,
        ship_to_street_address: newShipToStreetAddress,
        ship_to_detail_address: newShipToDetailAddress,
        shipping_instructions: null,
      } satisfies IShoppingMallOrder.IUpdate,
    },
  );
  typia.assert(updated2);

  TestValidator.equals(
    "shipping_instructions cleared",
    updated2.shipping_instructions,
    null,
  );
  TestValidator.equals(
    "ship_to_name persisted",
    updated2.ship_to_name,
    newShipToName,
  );
  TestValidator.equals(
    "ship_to_phone persisted",
    updated2.ship_to_phone,
    newShipToPhone,
  );
  TestValidator.equals(
    "ship_to_postal_code persisted",
    updated2.ship_to_postal_code,
    newShipToPostalCode,
  );
  TestValidator.equals(
    "ship_to_region persisted",
    updated2.ship_to_region,
    newShipToRegion,
  );
  TestValidator.equals(
    "ship_to_city persisted",
    updated2.ship_to_city,
    newShipToCity,
  );
  TestValidator.equals(
    "ship_to_street_address persisted",
    updated2.ship_to_street_address,
    newShipToStreetAddress,
  );
  TestValidator.equals(
    "ship_to_detail_address persisted",
    updated2.ship_to_detail_address,
    newShipToDetailAddress,
  );

  const afterItemStatuses =
    await api.functional.shoppingMall.member.orders.order_items.status.orderItemsStatus(
      memberConnection,
      { orderId },
    );
  typia.assert(afterItemStatuses);

  TestValidator.equals(
    "order item status payload unchanged",
    afterItemStatuses,
    beforeItemStatuses,
  );

  const after = await api.functional.shoppingMall.member.orders.at(
    memberConnection,
    { orderId },
  );
  typia.assert(after);

  TestValidator.equals(
    "re-fetch shipping_instructions cleared",
    after.shipping_instructions,
    null,
  );
}
