import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerAddress";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrder";
import type { IPageIEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_orders_items_cancelled(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
      description: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies IEcommerceSeller.IJoin,
  });
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoinResult.email,
      password: "1234",
    } satisfies IEcommerceSeller.ILogin,
  });
  // 2. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinResult = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://localhost",
      referrer: "https://localhost/sign-up",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerJoinResult.email,
      password: "1234",
    } satisfies IEcommerceCustomer.ILogin,
  });
  // 3. Get customer's orders
  const orders = await api.functional.ecommerce.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceOrder.IRequest,
    },
  );
  typia.assert(orders);
  // Check that at least one order exists before proceeding
  TestValidator.predicate("orders must exist", orders.data.length > 0);
  const order = orders.data[0];
  // 4. Seller retrieves the order items
  const orderItems = await api.functional.ecommerce.seller.orders.items.index(
    sellerConnection,
    {
      id: order.id,
      body: {
        page: 1,
        limit: 10,
        filters: {
          status: "cancelled",
        },
      } satisfies IEcommerceOrderItem.IRequest,
    },
  );
  typia.assert(orderItems);
  // Verify the cancelled item exists and has correct status
  const cancelledItem = orderItems.data.find(
    (item) => item.status === "cancelled",
  );
  TestValidator.equals("cancelled item should exist", cancelledItem, undefined);
  TestValidator.predicate(
    "status should be 'cancelled'",
    cancelledItem?.status === "cancelled",
  );
}
