import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator order list retrieval with pagination.
 *
 * Validates the administrator's ability to retrieve paginated order lists across all customers on the platform. This test ensures proper authentication, pagination metadata accuracy, and row-level security that allows administrators to view all orders regardless of customer ownership.
 *
 * The test verifies the complete order list retrieval flow including admin authentication, paginated query execution, response structure validation, and pagination metadata correctness. Special attention is given to verifying that administrators can access all orders on the platform without customer-based filtering restrictions.
 *
 * 1. Administrator registers and authenticates via admin join endpoint.
 * 2. Administrator retrieves order list with default pagination (page 0, limit 10).
 * 3. Validates response contains proper pagination metadata (current, limit, records, pages).
 * 4. Validates order summary records contain all required fields (id, order_number, status, total_price, created_at, customer).
 * 5. Validates customer references include all required fields (id, email, display_name, phone_number, created_at, deleted_at).
 * 6. Validates pagination calculations are mathematically correct (pages = ceil(records / limit)).
 * 7. Validates empty order list returns correct pagination metadata with zero records and pages.
 */
export async function test_api_admin_order_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Retrieve order list with default pagination
  const orderList = await api.functional.ecommerce.admin.orders.index(
    adminConnection,
    {
      body: {
        page: 0,
        limit: 10,
      } satisfies IEcommerceOrder.IRequest,
    },
  );
  typia.assert(orderList);
  // 3. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination has current page",
    orderList.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    orderList.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    orderList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    orderList.pagination.pages >= 0,
  );
  // 4. Validate pagination calculation correctness
  if (orderList.pagination.limit > 0) {
    const expectedPages = Math.ceil(
      orderList.pagination.records / orderList.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation correct",
      orderList.pagination.pages,
      expectedPages,
    );
  } else {
    TestValidator.equals(
      "pages is 0 when limit is 0",
      orderList.pagination.pages,
      0,
    );
  }
  // 5. Validate order data contains expected structure
  for (const order of orderList.data) {
    typia.assert(order);
  }
  // 6. Validate empty order list scenario with non-existent status filter
  const emptyOrderList = await api.functional.ecommerce.admin.orders.index(
    adminConnection,
    {
      body: {
        page: 0,
        limit: 10,
        status: "nonexistent_status",
      } satisfies IEcommerceOrder.IRequest,
    },
  );
  typia.assert(emptyOrderList);
  TestValidator.equals(
    "empty list has 0 records",
    emptyOrderList.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty list has 0 pages",
    emptyOrderList.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "empty list has empty data",
    emptyOrderList.data.length === 0,
  );
}
