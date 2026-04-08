import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_customer_order_history_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Update connection with auth token from authorize_member_join
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: memberAuth.token.access,
  };
  // 2. Get baseline order count (no filter)
  const allOrders: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.member.orders.index(memberConnection, {
      body: { limit: 100 },
    });
  typia.assert(allOrders);
  // 3. Test status filter: delivered
  const deliveredOrders: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.member.orders.index(memberConnection, {
      body: {
        status: "delivered",
        limit: 5,
      },
    });
  typia.assert(deliveredOrders);
  // Validate all delivered orders belong to authenticated member
  for (const order of deliveredOrders.data) {
    TestValidator.equals(
      "order customer ID matches authenticated member",
      order.customer.id,
      memberAuth.id,
    );
    TestValidator.equals(
      "order status is delivered",
      order.status,
      "delivered",
    );
  }
  // Validate pagination metadata for filtered results
  TestValidator.equals(
    "pagination records matches filtered count",
    deliveredOrders.pagination.records,
    deliveredOrders.data.length,
  );
  TestValidator.equals(
    "pagination limit is 5",
    deliveredOrders.pagination.limit,
    5,
  );
  TestValidator.equals(
    "pagination current is 1",
    deliveredOrders.pagination.current,
    1,
  );
  // 4. Test status filter: cancelled
  const cancelledOrders: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.member.orders.index(memberConnection, {
      body: {
        status: "cancelled",
        limit: 5,
      },
    });
  typia.assert(cancelledOrders);
  // Validate all cancelled orders belong to authenticated member
  for (const order of cancelledOrders.data) {
    TestValidator.equals(
      "cancelled order customer ID matches authenticated member",
      order.customer.id,
      memberAuth.id,
    );
    TestValidator.equals(
      "order status is cancelled",
      order.status,
      "cancelled",
    );
  }
  // Validate pagination metadata for cancelled filter
  TestValidator.equals(
    "cancelled pagination records matches filtered count",
    cancelledOrders.pagination.records,
    cancelledOrders.data.length,
  );
  // 5. Test status filter: shipped (if available)
  const shippedOrders: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.member.orders.index(memberConnection, {
      body: {
        status: "shipped",
        limit: 5,
      },
    });
  typia.assert(shippedOrders);
  // Validate all shipped orders belong to authenticated member
  for (const order of shippedOrders.data) {
    TestValidator.equals(
      "shipped order customer ID matches authenticated member",
      order.customer.id,
      memberAuth.id,
    );
    TestValidator.equals("order status is shipped", order.status, "shipped");
  }
  // Validate pagination metadata for shipped filter
  TestValidator.equals(
    "shipped pagination records matches filtered count",
    shippedOrders.pagination.records,
    shippedOrders.data.length,
  );
  // 6. Verify pagination metadata reflects filtered results, not total
  if (deliveredOrders.data.length < allOrders.data.length) {
    TestValidator.predicate(
      "filtered records less than all records",
      deliveredOrders.pagination.records < allOrders.pagination.records,
    );
  }
}
