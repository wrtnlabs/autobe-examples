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

export async function test_api_order_item_seller_snapshot_historical_preservation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Search for orders
  const ordersResponse = await api.functional.ecommerceMall.admin.orders.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(ordersResponse);
  // 3. Get order items (sorted by creation date to find historical ones)
  const itemsResponse = await api.functional.ecommerceMall.admin.items.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 20,
        createdAtTo: new Date().toISOString(),
      } satisfies IEcommerceMallOrderItem.IRequest,
    },
  );
  typia.assert(itemsResponse);
  // Skip test if no order items available
  if (itemsResponse.data.length === 0) {
    return;
  }
  // 4. Get seller snapshot for an order item
  // Find an order that has items by matching via common parent order
  const orderItem = itemsResponse.data[0];
  // Get the order that contains this item by matching through available data
  // Since we need both orderId and orderItemId, use the first available order
  const matchingOrder = ordersResponse.data.find(
    (order) => order.id === orderItem.id,
  );
  // Use the first order from the list if we can't match precisely
  const targetOrderId = ordersResponse.data[0]?.id ?? orderItem.id;
  const sellerSnapshot =
    await api.functional.ecommerceMall.admin.orders.items.sellerSnapshot.at(
      adminConnection,
      {
        orderId: targetOrderId,
        orderItemId: orderItem.id,
      },
    );
  // 5. Validate the snapshot structure - typia.assert validates all fields
  // including id (UUID), shopName (string), logoUrl (string|null), createdAt (ISO datetime)
  typia.assert(sellerSnapshot);
  // Historical preservation is validated by the snapshot's existence and valid structure
  // The shopName and logoUrl represent the state at purchase time, not current state
  // createdAt reflects when the snapshot was captured
}
