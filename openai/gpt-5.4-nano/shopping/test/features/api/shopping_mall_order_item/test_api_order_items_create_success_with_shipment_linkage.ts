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
import type { IShoppingMallShipmentConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentConfirmation";
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
import { generate_random_shopping_mall_member_shipments_create } from "../../../generate/generate_random_shopping_mall_member_shipments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_product_snapshot } from "../../../prepare/prepare_random_shopping_mall_product_snapshot";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_confirmation } from "../../../prepare/prepare_random_shopping_mall_shipment_confirmation";

export async function test_api_order_items_create_success_with_shipment_linkage(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member actor auth
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  await authorize_member_login(memberConnection, {
    body: {
      email: memberConnection.headers
        ? typia.random<string & tags.Format<"email">>()
        : typia.random<string & tags.Format<"email">>(),
      // NOTE: login body will be overwritten below; placeholder to satisfy TS.
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.ILogin,
  });
  // The authorize_member_join already created credentials, so generate new join+login
  // deterministically using authorize_member_join output by redoing login with same inputs.
  // To avoid reliance on connection headers, perform join then login in one go by reusing the join body.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IShoppingMallMember.IJoin;
  const memberJoinConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberJoinConnection, { body: joinBody });
  await authorize_member_login(memberJoinConnection, {
    body: {
      email: joinBody.email,
      password: joinBody.password,
    } satisfies IShoppingMallMember.ILogin,
  });
  const member: api.IConnection = memberJoinConnection;
  // 2) Admin actor auth
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminJoinBody });
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoinBody.email,
      password: adminJoinBody.password,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 3) Create customer order
  const order = await generate_random_shopping_mall_member_orders_create(
    member,
    {
      body: {
        // leave request generation default; this generator should satisfy IShoppingMallOrder.ICreate
      },
    },
  );
  typia.assert(order);
  // 4) Create first order item (seed) without shipment linkage
  const seededItem =
    await generate_random_shopping_mall_member_order_items_create(member, {
      body: {
        shopping_mall_order_id: order.id,
      },
    });
  typia.assert(seededItem);
  // 5) Create shipment grouping for that order using seeded item
  const shipment = await generate_random_shopping_mall_member_shipments_create(
    member,
    {
      body: {
        shopping_mall_order_id: order.id,
        shopping_mall_order_item_ids: [seededItem.id],
        shipment_confirmation: null,
      },
    },
  );
  typia.assert(shipment);
  // 6) Create second order item linked to the existing shipment
  const secondItemRequest: IShoppingMallOrderItem.ICreate = {
    shopping_mall_order_id: order.id,
    shopping_mall_product_variant_id: seededItem.shoppingMallProductVariantId,
    seller_snapshot_id: seededItem.sellerSnapshotId,
    shopping_mall_shipment_id: shipment.id,
    seller_price_at_purchase: seededItem.sellerPriceAtPurchase,
    quantity: seededItem.quantity,
    line_item_status: seededItem.lineItemStatus,
    placed_at: order.placed_at,
  };
  const created = await api.functional.shoppingMall.member.order_items.create(
    member,
    {
      body: secondItemRequest,
    },
  );
  typia.assert(created);
  // 7) Validate linkage consistency
  TestValidator.equals(
    "shopping mall shipment id matches request linkage",
    created.shoppingMallShipmentId,
    shipment.id,
  );
  TestValidator.equals(
    "order id matches",
    created.shoppingMallOrderId,
    order.id,
  );
  TestValidator.equals(
    "product variant id matches",
    created.shoppingMallProductVariantId,
    seededItem.shoppingMallProductVariantId,
  );
  TestValidator.equals(
    "seller snapshot id matches",
    created.sellerSnapshotId,
    seededItem.sellerSnapshotId,
  );
  TestValidator.equals(
    "shipment summary id matches",
    created.shipment?.id,
    shipment.id,
  );
  TestValidator.equals(
    "nested order id matches parent order",
    created.order.id,
    created.shoppingMallOrderId,
  );
}
