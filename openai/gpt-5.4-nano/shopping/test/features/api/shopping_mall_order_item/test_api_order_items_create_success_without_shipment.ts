import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_admin_product_snapshots_create } from "../../../generate/generate_random_shopping_mall_admin_product_snapshots_create";
import { generate_random_shopping_mall_member_order_items_create } from "../../../generate/generate_random_shopping_mall_member_order_items_create";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_product_snapshot } from "../../../prepare/prepare_random_shopping_mall_product_snapshot";

export async function test_api_order_items_create_success_without_shipment(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // 2) Create a customer order owned by the member
  const order: IShoppingMallOrder =
    await generate_random_shopping_mall_member_orders_create(
      memberConnection,
      {},
    );
  typia.assert(order);
  // Derive compatible purchase context from the order's existing line item
  const existingOrderItem: IShoppingMallOrderItem.ISummary =
    order.orderItems[0];
  const shoppingMallProductVariantId: string & tags.Format<"uuid"> =
    existingOrderItem.shopping_mall_product_variant_id;
  const sellerSnapshotId: string & tags.Format<"uuid"> =
    existingOrderItem.seller_snapshot_id;
  const sellerPriceAtPurchase: number =
    existingOrderItem.seller_price_at_purchase;
  const lineItemStatus: string = existingOrderItem.line_item_status;
  // 3) Create order item without shipment
  const quantity: number & tags.Type<"int32"> = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const placedAt: string & tags.Format<"date-time"> =
    new Date().toISOString() satisfies string & tags.Format<"date-time">;
  const body: IShoppingMallOrderItem.ICreate = {
    shopping_mall_order_id: order.id,
    shopping_mall_product_variant_id: shoppingMallProductVariantId,
    seller_snapshot_id: sellerSnapshotId,
    shopping_mall_shipment_id: null,
    seller_price_at_purchase: sellerPriceAtPurchase,
    quantity: quantity,
    line_item_status: lineItemStatus,
    placed_at: placedAt,
  };
  const created: IShoppingMallOrderItem =
    await api.functional.shoppingMall.member.order_items.create(
      memberConnection,
      {
        body,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "order item order id matches",
    created.shoppingMallOrderId,
    order.id,
  );
  TestValidator.equals(
    "order item variant id matches",
    created.shoppingMallProductVariantId,
    shoppingMallProductVariantId,
  );
  TestValidator.equals(
    "order item seller snapshot id matches",
    created.sellerSnapshotId,
    sellerSnapshotId,
  );
  TestValidator.equals(
    "order item shoppingMallShipmentId is null",
    created.shoppingMallShipmentId,
    null,
  );
  TestValidator.equals("order item shipment is null", created.shipment, null);
  TestValidator.equals(
    "seller price at purchase matches",
    created.sellerPriceAtPurchase,
    sellerPriceAtPurchase,
  );
  TestValidator.equals("quantity matches", created.quantity, quantity);
  TestValidator.equals(
    "line item status matches",
    created.lineItemStatus,
    lineItemStatus,
  );
  TestValidator.equals("placed at matches", created.placedAt, placedAt);
  TestValidator.equals("deleted at null", created.deletedAt, null);
}
