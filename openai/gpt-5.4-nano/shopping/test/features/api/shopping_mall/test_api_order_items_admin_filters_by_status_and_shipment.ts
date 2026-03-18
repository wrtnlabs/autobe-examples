import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

export async function test_api_order_items_admin_filters_by_status_and_shipment(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(adminAuthorized);
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuthorized);
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {},
  );
  typia.assert(order);
  const baseline =
    await api.functional.shoppingMall.admin.orders.order_items.index(
      adminConnection,
      {
        orderId: order.id,
        body: {
          page: 1 satisfies IShoppingMallOrderItem.IRequest["page"],
          limit: 50 satisfies IShoppingMallOrderItem.IRequest["limit"],
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(baseline);
  const items = baseline.data;
  TestValidator.predicate("has at least 2 order items", items.length >= 2);
  const shipped = items.filter((x) => x.shopping_mall_shipment_id !== null);
  TestValidator.predicate("has at least one shipped item", shipped.length >= 1);
  const unshipped = items.filter((x) => x.shopping_mall_shipment_id === null);
  TestValidator.predicate(
    "has at least one unshipped item",
    unshipped.length >= 1,
  );
  const unshippedStatus = unshipped[0]!.line_item_status;
  const shippedStatus = shipped[0]!.line_item_status;
  const pageNumber = 1 as IShoppingMallOrderItem.IRequest["page"];
  const pageSize = 50 as IShoppingMallOrderItem.IRequest["limit"];
  const unshippedResponse =
    await api.functional.shoppingMall.admin.orders.order_items.index(
      adminConnection,
      {
        orderId: order.id,
        body: {
          lineItemStatus: unshippedStatus,
          shipmentId: null,
          page: pageNumber,
          limit: pageSize,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(unshippedResponse);
  const expectedUnshipped = items.filter(
    (x) =>
      x.line_item_status === unshippedStatus &&
      x.shopping_mall_shipment_id === null,
  );
  TestValidator.equals(
    "pagination records (unshipped)",
    unshippedResponse.pagination.records,
    expectedUnshipped.length,
  );
  for (const item of unshippedResponse.data) {
    TestValidator.equals(
      "unshipped filter line_item_status",
      item.line_item_status,
      unshippedStatus,
    );
    TestValidator.equals(
      "unshipped filter shipment id is null",
      item.shopping_mall_shipment_id,
      null,
    );
  }
  const targetShipmentId = shipped[0]!.shopping_mall_shipment_id;
  typia.assert(targetShipmentId);
  const shippedResponse =
    await api.functional.shoppingMall.admin.orders.order_items.index(
      adminConnection,
      {
        orderId: order.id,
        body: {
          lineItemStatus: shippedStatus,
          shipmentId: targetShipmentId,
          page: pageNumber,
          limit: pageSize,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(shippedResponse);
  const expectedShipped = items.filter(
    (x) =>
      x.line_item_status === shippedStatus &&
      x.shopping_mall_shipment_id === targetShipmentId,
  );
  TestValidator.equals(
    "pagination records (shipped)",
    shippedResponse.pagination.records,
    expectedShipped.length,
  );
  for (const item of shippedResponse.data) {
    TestValidator.equals(
      "shipped filter line_item_status",
      item.line_item_status,
      shippedStatus,
    );
    TestValidator.equals(
      "shipped filter shipment id",
      item.shopping_mall_shipment_id,
      targetShipmentId,
    );
  }
}
