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

export async function test_api_order_items_admin_pagination_and_statuses(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin auth
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 2) Member create order
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.Format<"password">>();
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IShoppingMallMember.IJoin,
  });
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IShoppingMallMember.ILogin,
  });
  let shoppingOrder = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {
      body: undefined,
    },
  );
  typia.assert(shoppingOrder);
  // Ensure we have at least two distinct items
  while (shoppingOrder.orderItems.length < 2) {
    shoppingOrder = await generate_random_shopping_mall_member_orders_create(
      memberConnection,
      {
        body: undefined,
      },
    );
    typia.assert(shoppingOrder);
  }
  const orderId = shoppingOrder.id;
  // Build expected items keyed by order item id (best for repeat checking)
  const expectedItemById = new Map<string, IShoppingMallOrderItem.ISummary>();
  for (const item of shoppingOrder.orderItems) {
    expectedItemById.set(item.id, item);
  }
  const shipmentIds = new Set<string>(shoppingOrder.shipments.map((s) => s.id));
  const page1Request = {
    shoppingOrderId: orderId,
    page: 1,
    limit: 10,
    sortBy: "placed_at",
    sortDirection: "desc",
  } satisfies IShoppingMallOrderItem.IRequest;
  const page1 =
    await api.functional.shoppingMall.admin.orders.order_items.index(
      adminConnection,
      {
        orderId,
        body: page1Request,
      },
    );
  typia.assert(page1);
  TestValidator.equals("pagination current page", page1.pagination.current, 1);
  TestValidator.equals("pagination limit", page1.pagination.limit, 10);
  TestValidator.predicate(
    "page1 records non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page1 pages non-negative",
    page1.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page1 data length within limit",
    page1.data.length <= 10,
  );
  const page1Ids = new Set<string>();
  for (const it of page1.data) {
    TestValidator.equals("orderId scoped", it.shopping_mall_order_id, orderId);
    TestValidator.predicate("quantity non-negative", it.quantity >= 0);
    TestValidator.predicate(
      "seller price non-negative",
      it.seller_price_at_purchase >= 0,
    );
    TestValidator.equals("deleted_at null", it.deleted_at, null);
    const expected = expectedItemById.get(it.id);
    if (expected) {
      TestValidator.equals(
        "line_item_status matches",
        it.line_item_status,
        expected.line_item_status,
      );
      TestValidator.equals("quantity matches", it.quantity, expected.quantity);
      TestValidator.equals(
        "seller price matches",
        it.seller_price_at_purchase,
        expected.seller_price_at_purchase,
      );
      TestValidator.equals(
        "shipment id matches expected",
        it.shopping_mall_shipment_id,
        expected.shopping_mall_shipment_id,
      );
    }
    if (it.shopping_mall_shipment_id !== null) {
      if (shipmentIds.size > 0) {
        TestValidator.predicate(
          "shipment id known",
          shipmentIds.has(it.shopping_mall_shipment_id),
        );
      }
    }
    TestValidator.predicate("pagination unique item ids", !page1Ids.has(it.id));
    page1Ids.add(it.id);
  }
  const page2Request = {
    shoppingOrderId: orderId,
    page: 2,
    limit: 10,
    sortBy: "placed_at",
    sortDirection: "desc",
  } satisfies IShoppingMallOrderItem.IRequest;
  const page2 =
    await api.functional.shoppingMall.admin.orders.order_items.index(
      adminConnection,
      {
        orderId,
        body: page2Request,
      },
    );
  typia.assert(page2);
  TestValidator.equals(
    "pagination current page page2",
    page2.pagination.current,
    2,
  );
  TestValidator.equals("pagination limit page2", page2.pagination.limit, 10);
  TestValidator.equals(
    "pagination records consistent",
    page2.pagination.records,
    page1.pagination.records,
  );
  TestValidator.equals(
    "pagination pages consistent",
    page2.pagination.pages,
    page1.pagination.pages,
  );
  TestValidator.predicate(
    "page2 data length within limit",
    page2.data.length <= 10,
  );
  const page2Ids = new Set<string>(page2.data.map((x) => x.id));
  for (const id of page2Ids) {
    TestValidator.predicate("no repeats across pages", !page1Ids.has(id));
  }
}
