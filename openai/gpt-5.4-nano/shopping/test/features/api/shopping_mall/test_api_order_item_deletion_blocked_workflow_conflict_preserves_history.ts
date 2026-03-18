import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
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
import { generate_random_shopping_mall_member_addresses_create } from "../../../generate/generate_random_shopping_mall_member_addresses_create";
import { generate_random_shopping_mall_member_cancellation_requests_create_cancellation_request } from "../../../generate/generate_random_shopping_mall_member_cancellation_requests_create_cancellation_request";
import { generate_random_shopping_mall_member_carts_create } from "../../../generate/generate_random_shopping_mall_member_carts_create";
import { generate_random_shopping_mall_member_carts_items_create } from "../../../generate/generate_random_shopping_mall_member_carts_items_create";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_payments_create } from "../../../generate/generate_random_shopping_mall_member_payments_create";
import { generate_random_shopping_mall_member_refund_requests_create } from "../../../generate/generate_random_shopping_mall_member_refund_requests_create";
import { generate_random_shopping_mall_member_shipments_confirmations_create } from "../../../generate/generate_random_shopping_mall_member_shipments_confirmations_create";
import { generate_random_shopping_mall_member_shipments_create } from "../../../generate/generate_random_shopping_mall_member_shipments_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_cart } from "../../../prepare/prepare_random_shopping_mall_cart";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_payment } from "../../../prepare/prepare_random_shopping_mall_payment";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_confirmation } from "../../../prepare/prepare_random_shopping_mall_shipment_confirmation";

export async function test_api_order_item_deletion_blocked_workflow_conflict_preserves_history(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuth);
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers = {
    Authorization: memberAuth.token.access,
  };
  // 1) Address + lock
  const address = await generate_random_shopping_mall_member_addresses_create(
    authConnection,
    {},
  );
  typia.assert(address);
  await api.functional.shoppingMall.member.addresses.lock_for_checkout.lockForCheckout(
    authConnection,
    {
      addressId: address.id,
    },
  );
  // 2) Cart + item
  const cart = await generate_random_shopping_mall_member_carts_create(
    authConnection,
    {},
  );
  typia.assert(cart);
  const cartItem =
    await generate_random_shopping_mall_member_carts_items_create(
      authConnection,
      {
        params: { cartId: cart.id },
      },
    );
  typia.assert(cartItem);
  // 3) Payment attempt
  const payment = await generate_random_shopping_mall_member_payments_create(
    authConnection,
    {},
  );
  typia.assert(payment);
  // 4) Order from payment
  const order = await generate_random_shopping_mall_member_orders_create(
    authConnection,
    {
      body: {
        shopping_mall_payment_id: payment.id,
        ship_to_name: RandomGenerator.name(),
        ship_to_phone: RandomGenerator.mobile(),
        ship_to_postal_code: RandomGenerator.alphabets(6),
        ship_to_region: "Seoul",
        ship_to_city: "Seoul",
        ship_to_street_address: "Street 1",
        ship_to_detail_address: "Detail",
        shipping_instructions: null,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  TestValidator.predicate(
    "order has at least one order item",
    order.orderItems.length > 0,
  );
  const orderItemId = order.orderItems[0].id;
  // 5) Create shipment grouping for the order item
  const shipment = await api.functional.shoppingMall.member.shipments.create(
    authConnection,
    {
      body: {
        shopping_mall_order_id: order.id,
        shopping_mall_order_item_ids: [orderItemId],
        shipment_confirmation: null,
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 6) Confirm shipment
  const confirmation =
    await generate_random_shopping_mall_member_shipments_confirmations_create(
      authConnection,
      {
        params: { shipmentId: shipment.id },
      },
    );
  typia.assert(confirmation);
  // 7) Create cancellation + refund requests for same order item
  const cancellation =
    await generate_random_shopping_mall_member_cancellation_requests_create_cancellation_request(
      authConnection,
      {
        body: {
          orderItemId,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellation);
  const refund =
    await generate_random_shopping_mall_member_refund_requests_create(
      authConnection,
      {
        body: {
          orderItemId,
          customerReason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refund);
  // 8) Read order item before deletion attempt (capture snapshot linkage)
  const orderItemBefore =
    await api.functional.shoppingMall.member.order_items.at(authConnection, {
      orderItemId,
    });
  typia.assert(orderItemBefore);
  // 9) Deletion should be blocked by workflow conflict
  await TestValidator.httpError(
    "deletion blocked by workflow conflict",
    [403, 409],
    async () => {
      await api.functional.shoppingMall.member.order_items.erase(
        authConnection,
        {
          orderItemId,
        },
      );
    },
  );
  // 10) Ensure order item still retrievable and immutable context preserved
  const orderItemAfter =
    await api.functional.shoppingMall.member.order_items.at(authConnection, {
      orderItemId,
    });
  typia.assert(orderItemAfter);
  TestValidator.equals(
    "orderItem id unchanged",
    orderItemAfter.id,
    orderItemBefore.id,
  );
  TestValidator.equals(
    "seller snapshot linkage preserved",
    orderItemAfter.sellerSnapshotId,
    orderItemBefore.sellerSnapshotId,
  );
  TestValidator.equals(
    "shipment association preserved",
    orderItemAfter.shoppingMallShipmentId,
    orderItemBefore.shoppingMallShipmentId,
  );
  TestValidator.equals(
    "order item not deleted",
    orderItemAfter.deletedAt,
    null,
  );
}
