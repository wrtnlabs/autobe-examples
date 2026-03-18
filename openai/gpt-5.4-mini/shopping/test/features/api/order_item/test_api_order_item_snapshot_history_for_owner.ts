import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_item_snapshot_history_for_owner(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  const order = await api.functional.shoppingMall.customer.orders.at(
    customerConnection,
    {
      orderId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(order);
  TestValidator.predicate(
    "order contains at least one purchased item",
    order.orderItems.length > 0,
  );
  const orderItem = order.orderItems[0];
  const page =
    await api.functional.shoppingMall.customer.orderItems.snapshots.index(
      customerConnection,
      {
        orderItemId: orderItem.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(page);
  TestValidator.equals("snapshot page current", page.pagination.current, 1);
  TestValidator.equals("snapshot page limit", page.pagination.limit, 100);
  TestValidator.predicate(
    "snapshot page records non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "snapshot page pages non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "snapshot list size within limit",
    page.data.length <= page.pagination.limit,
  );
  for (const snapshot of page.data) {
    TestValidator.equals(
      "snapshot order item id",
      snapshot.orderItem.id,
      orderItem.id,
    );
    TestValidator.predicate(
      "product name preserved",
      snapshot.productName.length > 0,
    );
    TestValidator.predicate(
      "product description preserved",
      snapshot.productDescription.length > 0,
    );
    TestValidator.predicate(
      "variant sku preserved",
      snapshot.variantSku.length > 0,
    );
    TestValidator.predicate(
      "variant option values preserved",
      snapshot.variantOptionValues.length > 0,
    );
    TestValidator.predicate(
      "seller shop name preserved",
      snapshot.sellerShopName.length > 0,
    );
    TestValidator.predicate("quantity positive", snapshot.quantity > 0);
    TestValidator.predicate("unit price non-negative", snapshot.unitPrice >= 0);
    TestValidator.predicate(
      "total price non-negative",
      snapshot.totalPrice >= 0,
    );
    TestValidator.predicate(
      "snapshot timestamp valid",
      snapshot.createdAt.length > 0,
    );
  }
}
