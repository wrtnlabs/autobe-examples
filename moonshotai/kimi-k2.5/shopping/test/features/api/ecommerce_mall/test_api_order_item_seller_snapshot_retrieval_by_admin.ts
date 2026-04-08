import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSellerSnapshot";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_order_item_seller_snapshot_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IEcommerceMallAdmin.IJoin>(),
  });
  // 2. Query orders to find existing orders
  const ordersResponse: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.admin.orders.index(adminConnection, {
      body: {
        page: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >() satisfies number as number,
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >() satisfies number as number,
      } satisfies IEcommerceMallOrder.IRequest,
    });
  typia.assert(ordersResponse);
  // Assume we found an order
  const order = ordersResponse.data[0];
  typia.assertGuard(order);
  const orderId: string = order.id;
  // 3. Query order items by orderId
  const orderItemsResponse: IPageIEcommerceMallOrderItem.ISummary =
    await api.functional.ecommerceMall.admin.items.index(adminConnection, {
      body: {
        orderId: orderId,
        page: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >() satisfies number as number,
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >() satisfies number as number,
      } satisfies IEcommerceMallOrderItem.IRequest,
    });
  typia.assert(orderItemsResponse);
  // Assume we found an order item
  const orderItem = orderItemsResponse.data[0];
  typia.assertGuard(orderItem);
  const orderItemId: string = orderItem.id;
  // 4. Retrieve seller snapshot
  const sellerSnapshot: IEcommerceMallOrderItemSellerSnapshot =
    await api.functional.ecommerceMall.admin.orders.items.sellerSnapshot.at(
      adminConnection,
      {
        orderId: orderId,
        orderItemId: orderItemId,
      },
    );
  typia.assert(sellerSnapshot);
}
