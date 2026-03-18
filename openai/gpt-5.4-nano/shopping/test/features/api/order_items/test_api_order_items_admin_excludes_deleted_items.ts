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

export async function test_api_order_items_admin_excludes_deleted_items(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin register + login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const adminAuthJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuthJoin);
  const adminAuth = await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(adminAuth);
  // 2) Member register + login
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.Format<"password">>();
  const memberAuthJoin = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuthJoin);
  const memberAuth = await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IShoppingMallMember.ILogin,
  });
  typia.assert(memberAuth);
  // 3) Create Order A
  const orderA = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {},
  );
  typia.assert(orderA);
  // 4) Create Order B
  const orderB = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {},
  );
  typia.assert(orderB);
  TestValidator.notEquals("order ids should differ", orderA.id, orderB.id);
  // 5) Fetch at least one order item for Order A, then capture an item id
  const orderAItemsPage =
    await api.functional.shoppingMall.admin.orders.order_items.index(
      adminConnection,
      {
        orderId: orderA.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(orderAItemsPage);
  TestValidator.predicate(
    "orderA should have at least one order item",
    orderAItemsPage.data.length > 0,
  );
  const removedOrderItemId: IShoppingMallOrderItem.ISummary["id"] =
    orderAItemsPage.data[0]!.id;
  // 6) Delete (remove) that specific Order A order item
  await api.functional.shoppingMall.admin.admin.order_items.erase(
    adminConnection,
    {
      orderItemId: removedOrderItemId,
    },
  );
  // 7) Admin list order items for Order A (removed item must be excluded)
  const pageA =
    await api.functional.shoppingMall.admin.orders.order_items.index(
      adminConnection,
      {
        orderId: orderA.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(pageA);
  TestValidator.predicate(
    "all returned items for Order A should be scoped to orderA",
    () => pageA.data.every((it) => it.shopping_mall_order_id === orderA.id),
  );
  TestValidator.predicate(
    "removed order item should not appear in Order A listing",
    () => pageA.data.every((it) => it.id !== removedOrderItemId),
  );
  // 8) Admin list order items for Order B (no cross-order contamination)
  const pageB =
    await api.functional.shoppingMall.admin.orders.order_items.index(
      adminConnection,
      {
        orderId: orderB.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(pageB);
  TestValidator.predicate(
    "all returned items for Order B should be scoped to orderB",
    () => pageB.data.every((it) => it.shopping_mall_order_id === orderB.id),
  );
  TestValidator.predicate(
    "removed order item from Order A should not appear in Order B listing",
    () => pageB.data.every((it) => it.id !== removedOrderItemId),
  );
}
