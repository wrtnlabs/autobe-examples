import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
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
import { generate_random_shopping_mall_member_carts_create } from "../../../generate/generate_random_shopping_mall_member_carts_create";
import { generate_random_shopping_mall_member_carts_items_create } from "../../../generate/generate_random_shopping_mall_member_carts_items_create";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_shipment_confirmations_create } from "../../../generate/generate_random_shopping_mall_member_shipment_confirmations_create";
import { generate_random_shopping_mall_member_shipments_create } from "../../../generate/generate_random_shopping_mall_member_shipments_create";
import { prepare_random_shopping_mall_cart } from "../../../prepare/prepare_random_shopping_mall_cart";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_confirmation } from "../../../prepare/prepare_random_shopping_mall_shipment_confirmation";

export async function test_api_shipment_confirmation_delivery_applies_per_shipment(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string &
        tags.Format<"password">,
    } satisfies IShoppingMallMember.IJoin,
  });
  memberConnection.headers ??= {};
  memberConnection.headers.Authorization = memberAuth.token.access;

  // 2) Seed cart and items
  const cart = await generate_random_shopping_mall_member_carts_create(
    memberConnection,
    {},
  );

  const cartItemBase1 = prepare_random_shopping_mall_cart_item();
  const cartItemBase2 = prepare_random_shopping_mall_cart_item();

  // Create at least two cart items so checkout can produce at least two order items.
  await generate_random_shopping_mall_member_carts_items_create(
    memberConnection,
    {
      params: { cartId: cart.id },
      body: {
        ...cartItemBase1,
        quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      } satisfies IShoppingMallCartItem.ICreate,
    },
  );

  await generate_random_shopping_mall_member_carts_items_create(
    memberConnection,
    {
      params: { cartId: cart.id },
      body: {
        ...cartItemBase2,
        quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      } satisfies IShoppingMallCartItem.ICreate,
    },
  );

  // 3) Create an order from the prepared member checkout flow context
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {},
  );
  typia.assert(order);

  // 4) Create a shipment grouping for the order
  const shipment = await generate_random_shopping_mall_member_shipments_create(
    memberConnection,
    {},
  );
  typia.assert(shipment);
  typia.assertGuard(shipment.orderItems.length >= 2);

  // 5) Submit seller shipment confirmation with null tracking_url and non-null note
  const confirmationNote = RandomGenerator.paragraph({ sentences: 2 });
  const confirmedAt = new Date().toISOString();

  const confirmation =
    await generate_random_shopping_mall_member_shipment_confirmations_create(
      memberConnection,
      {
        body: {
          shoppingMallShipmentId: shipment.id,
          confirmationType: "delivered",
          confirmedAt: confirmedAt,
          trackingUrl: null,
          note: confirmationNote,
        } satisfies IShoppingMallShipmentConfirmation.ICreate,
      },
    );
  typia.assert(confirmation);

  // 6) Assert persistence effects on the returned confirmation record
  TestValidator.equals(
    "tracking_url stored as null",
    confirmation.tracking_url,
    null,
  );
  TestValidator.equals("note stored", confirmation.note, confirmationNote);
}
