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

export async function test_api_order_item_retrieval_shipment_nullable_unassigned(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as a member (actor-specific)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2) Create a customer order
  const createdOrder = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {},
  );
  typia.assert(createdOrder);
  TestValidator.predicate(
    "order should have at least one order item",
    createdOrder.orderItems.length > 0,
  );
  const candidateItem = createdOrder.orderItems[0];
  typia.assert(candidateItem);
  const orderItemId = candidateItem.id;
  // 3) Retrieve order item before shipment assignment
  const itemBefore = await api.functional.shoppingMall.member.order_items.at(
    memberConnection,
    {
      orderItemId,
    },
  );
  typia.assert(itemBefore);
  TestValidator.equals(
    "shipment must be null before assignment",
    itemBefore.shipment,
    null,
  );
  TestValidator.equals(
    "shoppingMallShipmentId must be null before assignment",
    itemBefore.shoppingMallShipmentId,
    null,
  );
  // Purchase-time fields present and stable
  const sellerSnapshotIdBefore = itemBefore.sellerSnapshotId;
  const sellerPriceAtPurchaseBefore = itemBefore.sellerPriceAtPurchase;
  const quantityBefore = itemBefore.quantity;
  const placedAtBefore = itemBefore.placedAt;
  const lineItemStatusBefore = itemBefore.lineItemStatus;
  const sellerSnapshotBefore = itemBefore.sellerSnapshot;
  const productVariantBefore = itemBefore.productVariant;
  // 4) Re-call GET /order-items/{id} (shipment assignment flow not available in provided APIs)
  const itemAfter = await api.functional.shoppingMall.member.order_items.at(
    memberConnection,
    {
      orderItemId,
    },
  );
  typia.assert(itemAfter);
  // Shipment-related fields should remain nullable if assignment was not progressed.
  TestValidator.equals(
    "shipment remains null without fulfillment progression",
    itemAfter.shipment,
    null,
  );
  TestValidator.equals(
    "shoppingMallShipmentId remains null without fulfillment progression",
    itemAfter.shoppingMallShipmentId,
    null,
  );
  // Purchase-time fields must remain stable across reads
  TestValidator.equals(
    "sellerSnapshotId stable",
    itemAfter.sellerSnapshotId,
    sellerSnapshotIdBefore,
  );
  TestValidator.equals(
    "sellerPriceAtPurchase stable",
    itemAfter.sellerPriceAtPurchase,
    sellerPriceAtPurchaseBefore,
  );
  TestValidator.equals("quantity stable", itemAfter.quantity, quantityBefore);
  TestValidator.equals("placedAt stable", itemAfter.placedAt, placedAtBefore);
  TestValidator.equals(
    "lineItemStatus stable",
    itemAfter.lineItemStatus,
    lineItemStatusBefore,
  );
  TestValidator.equals(
    "sellerSnapshot stable",
    itemAfter.sellerSnapshot,
    sellerSnapshotBefore,
  );
  TestValidator.equals(
    "productVariant stable",
    itemAfter.productVariant,
    productVariantBefore,
  );
}
