import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_orders_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Step 2: Fetch orders with 'paid' status filter
  const paidStatusRequest = {
    status: "paid",
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallOrder.IRequest;
  const paidOrdersResponse =
    await api.functional.ecommerceMall.admin.orders.index(adminConnection, {
      body: paidStatusRequest,
    });
  typia.assert(paidOrdersResponse);
  // Step 3: Test shipped status filter
  const shippedStatusRequest = {
    status: "shipped",
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallOrder.IRequest;
  const shippedOrdersResponse =
    await api.functional.ecommerceMall.admin.orders.index(adminConnection, {
      body: shippedStatusRequest,
    });
  typia.assert(shippedOrdersResponse);
  // Step 4: Test non-existent status combination for empty result set
  const nonExistentStatusRequest = {
    status: "NONEXISTENT_STATUS_12345",
    page: 1,
    limit: 20,
  } satisfies IEcommerceMallOrder.IRequest;
  const emptyResponse = await api.functional.ecommerceMall.admin.orders.index(
    adminConnection,
    { body: nonExistentStatusRequest },
  );
  typia.assert(emptyResponse);
  // Step 5: Test delivered status filter with random pagination
  const deliveredStatusRequest = {
    status: "delivered",
    page: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
    >(),
  } satisfies IEcommerceMallOrder.IRequest;
  const deliveredOrdersResponse =
    await api.functional.ecommerceMall.admin.orders.index(adminConnection, {
      body: deliveredStatusRequest,
    });
  typia.assert(deliveredOrdersResponse);
  // Step 6: Test cancelled status filter
  const cancelledStatusRequest = {
    status: "cancelled",
    page: 1,
    limit: 5,
  } satisfies IEcommerceMallOrder.IRequest;
  const cancelledOrdersResponse =
    await api.functional.ecommerceMall.admin.orders.index(adminConnection, {
      body: cancelledStatusRequest,
    });
  typia.assert(cancelledOrdersResponse);
  // Step 7: Test refunded status filter
  const refundedStatusRequest = {
    status: "refunded",
    page: 1,
    limit: 5,
  } satisfies IEcommerceMallOrder.IRequest;
  const refundedOrdersResponse =
    await api.functional.ecommerceMall.admin.orders.index(adminConnection, {
      body: refundedStatusRequest,
    });
  typia.assert(refundedOrdersResponse);
}
