import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_order_filtering_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      actorType: "customer",
      requestedGrade: "admin",
      reason: "Need admin access to test order filtering functionality",
      href: "http://localhost:3000/admin/orders",
      referrer: "http://localhost:3000/",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Define valid order statuses for testing
  const validStatuses = [
    "paid",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
    "partially_completed",
  ] as const;
  // 2. Test single status filter for each valid status
  for (const status of validStatuses) {
    const result = await api.functional.ecommerceMall.admin.orders.index(
      adminConnection,
      {
        body: {
          status: status,
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
    typia.assert(result);
    // Validate pagination structure
    TestValidator.equals(
      "pagination exists",
      result.pagination.pagination !== null,
      true,
    );
    TestValidator.predicate(
      "records >= 0",
      result.pagination.pagination.records >= 0,
    );
    TestValidator.predicate(
      "current page is 1",
      result.pagination.pagination.current === 1,
    );
    // Validate all returned orders have the correct status
    for (const order of result.data) {
      TestValidator.equals(`order status is ${status}`, order.status, status);
    }
  }
  // 3. Test array of multiple statuses (IN clause)
  const statusArray = ["paid", "shipped", "delivered"] as const;
  const multiStatusResult =
    await api.functional.ecommerceMall.admin.orders.index(adminConnection, {
      body: {
        status: [...statusArray],
        limit: 50,
        page: 1,
      } satisfies IEcommerceMallOrder.IRequest,
    });
  typia.assert(multiStatusResult);
  // Validate pagination structure
  TestValidator.equals(
    "pagination exists",
    multiStatusResult.pagination.pagination !== null,
    true,
  );
  // Validate all returned orders have one of the expected statuses
  for (const order of multiStatusResult.data) {
    TestValidator.predicate(
      `order status is one of [${statusArray.join(", ")}]`,
      statusArray.includes(order.status as (typeof statusArray)[number]),
    );
  }
  // 4. Test filtering with all valid statuses as array
  const allStatusesResult =
    await api.functional.ecommerceMall.admin.orders.index(adminConnection, {
      body: {
        status: [...validStatuses],
        limit: 100,
        page: 1,
      } satisfies IEcommerceMallOrder.IRequest,
    });
  typia.assert(allStatusesResult);
  // Validate all returned orders have a valid status
  for (const order of allStatusesResult.data) {
    TestValidator.predicate(
      "order status is valid",
      validStatuses.includes(order.status as (typeof validStatuses)[number]),
    );
  }
  // 5. Test single status with pagination
  const paginatedResult = await api.functional.ecommerceMall.admin.orders.index(
    adminConnection,
    {
      body: {
        status: "paid",
        limit: 5,
        page: 1,
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "limit is 5",
    paginatedResult.pagination.pagination.limit === 5,
  );
  TestValidator.predicate(
    "current is 1",
    paginatedResult.pagination.pagination.current === 1,
  );
  TestValidator.predicate("data count <= 5", paginatedResult.data.length <= 5);
  // Validate all orders have paid status
  for (const order of paginatedResult.data) {
    TestValidator.equals("order status is paid", order.status, "paid");
  }
}
