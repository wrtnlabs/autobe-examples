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

export async function test_api_order_item_update_shipment_linkage_consistency(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register member account
  const memberConnection: api.IConnection = { host: connection.host };
  const password: string = RandomGenerator.alphaNumeric(16);
  const memberEmail = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password,
    },
  });
  // 2) Login (actor-specific connection)
  const authorizedConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_login(authorizedConnection, {
    body: {
      email: memberEmail,
      password,
    } satisfies IShoppingMallMember.ILogin,
  });
  typia.assert(authorized);
  // 3) Create customer order
  const order = await generate_random_shopping_mall_member_orders_create(
    authorizedConnection,
    {},
  );
  typia.assert(order);
  // 4) Create an order item under the created order
  const orderItemCreateBase = prepare_random_shopping_mall_order_item({
    shopping_mall_order_id: order.id,
    shopping_mall_shipment_id: null,
  } satisfies DeepPartial<IShoppingMallOrderItem.ICreate>);
  const orderItem =
    await generate_random_shopping_mall_member_order_items_create(
      authorizedConnection,
      {
        body: orderItemCreateBase,
      },
    );
  typia.assert(orderItem);
  const orderItemId = orderItem.id;
  // 5) Create a shipment grouping for the created order and capture shipmentId
  const shipment = await generate_random_shopping_mall_member_shipments_create(
    authorizedConnection,
    {
      body: {
        shopping_mall_order_id: order.id,
        shopping_mall_order_item_ids: [orderItemId],
        shipment_confirmation: null,
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  const shipmentId = shipment.id;
  // 6) Link case: keep current compatible line_item_status while linking
  const beforeLink = orderItem;
  const beforeLineItemStatus = beforeLink.lineItemStatus;
  const beforeLinkUpdatedAt = beforeLink.updatedAt;
  const linked = await api.functional.shoppingMall.member.order_items.update(
    authorizedConnection,
    {
      orderItemId,
      body: {
        line_item_status: beforeLineItemStatus,
        shopping_mall_shipment_id: shipmentId,
      } satisfies IShoppingMallOrderItem.IUpdate,
    },
  );
  typia.assert(linked);
  TestValidator.equals(
    "shoppingMallShipmentId updated",
    linked.shoppingMallShipmentId,
    shipmentId,
  );
  TestValidator.equals(
    "lineItemStatus unchanged",
    linked.lineItemStatus,
    beforeLineItemStatus,
  );
  TestValidator.equals(
    "sellerSnapshotId unchanged",
    linked.sellerSnapshotId,
    beforeLink.sellerSnapshotId,
  );
  TestValidator.equals(
    "quantity unchanged",
    linked.quantity,
    beforeLink.quantity,
  );
  TestValidator.equals(
    "sellerPriceAtPurchase unchanged",
    linked.sellerPriceAtPurchase,
    beforeLink.sellerPriceAtPurchase,
  );
  TestValidator.equals(
    "shoppingMallOrderId unchanged",
    linked.shoppingMallOrderId,
    beforeLink.shoppingMallOrderId,
  );
  TestValidator.equals(
    "shoppingMallProductVariantId unchanged",
    linked.shoppingMallProductVariantId,
    beforeLink.shoppingMallProductVariantId,
  );
  TestValidator.predicate(
    "updatedAt advanced on link",
    linked.updatedAt !== beforeLinkUpdatedAt,
  );
  // 7) Unlink case: set shopping_mall_shipment_id to null with same status
  const beforeUnlinkUpdatedAt = linked.updatedAt;
  const unlinked = await api.functional.shoppingMall.member.order_items.update(
    authorizedConnection,
    {
      orderItemId,
      body: {
        line_item_status: beforeLineItemStatus,
        shopping_mall_shipment_id: null,
      } satisfies IShoppingMallOrderItem.IUpdate,
    },
  );
  typia.assert(unlinked);
  TestValidator.equals(
    "shoppingMallShipmentId becomes null",
    unlinked.shoppingMallShipmentId,
    null,
  );
  TestValidator.equals(
    "lineItemStatus unchanged after unlink",
    unlinked.lineItemStatus,
    beforeLineItemStatus,
  );
  TestValidator.equals(
    "sellerSnapshotId unchanged after unlink",
    unlinked.sellerSnapshotId,
    beforeLink.sellerSnapshotId,
  );
  TestValidator.equals(
    "quantity unchanged after unlink",
    unlinked.quantity,
    beforeLink.quantity,
  );
  TestValidator.equals(
    "sellerPriceAtPurchase unchanged after unlink",
    unlinked.sellerPriceAtPurchase,
    beforeLink.sellerPriceAtPurchase,
  );
  TestValidator.equals(
    "shoppingMallOrderId unchanged after unlink",
    unlinked.shoppingMallOrderId,
    beforeLink.shoppingMallOrderId,
  );
  TestValidator.equals(
    "shoppingMallProductVariantId unchanged after unlink",
    unlinked.shoppingMallProductVariantId,
    beforeLink.shoppingMallProductVariantId,
  );
  TestValidator.predicate(
    "updatedAt advanced on unlink",
    unlinked.updatedAt !== beforeUnlinkUpdatedAt,
  );
  // 8) Consistency check: incompatible line_item_status must not change persisted state
  const persistedShipmentId = unlinked.shoppingMallShipmentId;
  const persistedLineItemStatus = unlinked.lineItemStatus;
  const persistedUpdatedAt = unlinked.updatedAt;
  const incompatibleStatus = `${persistedLineItemStatus}_incompatible_${RandomGenerator.alphabets(6)}`;
  await TestValidator.error(
    "should reject incompatible line_item_status with shipment linkage change",
    async () => {
      await api.functional.shoppingMall.member.order_items.update(
        authorizedConnection,
        {
          orderItemId,
          body: {
            line_item_status: incompatibleStatus,
            shopping_mall_shipment_id: shipmentId,
          } satisfies IShoppingMallOrderItem.IUpdate,
        },
      );
    },
  );
  // Verify persisted state did not change; updatedAt should not advance.
  const afterFailed =
    await api.functional.shoppingMall.member.order_items.update(
      authorizedConnection,
      {
        orderItemId,
        body: {
          line_item_status: persistedLineItemStatus,
          shopping_mall_shipment_id: persistedShipmentId,
        } satisfies IShoppingMallOrderItem.IUpdate,
      },
    );
  typia.assert(afterFailed);
  TestValidator.equals(
    "shipment linkage unchanged after failed incompatible update",
    afterFailed.shoppingMallShipmentId,
    persistedShipmentId,
  );
  TestValidator.equals(
    "lineItemStatus unchanged after failed incompatible update",
    afterFailed.lineItemStatus,
    persistedLineItemStatus,
  );
  TestValidator.equals(
    "updatedAt did not advance after failed incompatible update",
    afterFailed.updatedAt,
    persistedUpdatedAt,
  );
}
