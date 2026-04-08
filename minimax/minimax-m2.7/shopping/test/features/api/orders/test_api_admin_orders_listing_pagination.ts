import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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

/**
 * Test admin orders listing with pagination parameters.
 *
 * Validates that an authenticated administrator can successfully retrieve a paginated list of all orders on the platform. This test ensures the order listing endpoint returns correct pagination metadata, order summary fields, and proper sorting.
 *
 * **Test Flow:**
 * 1. Administrator authentication via admin join endpoint
 * 2. Request paginated order list with page=1, limit=20
 * 3. Validate response structure and pagination metadata
 * 4. Validate order summary fields are present
 * 5. Validate orders sorted by created_at descending
 *
 * **Business Validation:**
 * - Pagination metadata is correct (current page, limit, total records, total pages)
 * - Order summaries contain all required fields (id, order_number, status, subtotal, shipping_cost, total_amount, created_at, customer, items_count, shipments_count)
 * - Sorting by created_at descending (newest first)
 */
export async function test_api_admin_orders_listing_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Request paginated order list
  const pageNumber = 1;
  const pageLimit = 20;
  const response = await api.functional.ecommerceMall.admin.admin.orders.index(
    adminConnection,
    {
      body: {
        page: pageNumber,
        limit: pageLimit,
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate pagination metadata structure
  TestValidator.equals(
    "pagination.current exists",
    response.pagination.current !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination.limit exists",
    response.pagination.limit !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination.records exists",
    response.pagination.records !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination.pages exists",
    response.pagination.pages !== undefined,
    true,
  );
  // 4. Validate pagination values are non-negative
  TestValidator.predicate(
    "pagination.current >= 0",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit >= 0",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages >= 0",
    response.pagination.pages >= 0,
  );
  // 5. Validate pagination pages calculation
  if (response.pagination.records > 0 && response.pagination.limit > 0) {
    const expectedPages = Math.ceil(
      response.pagination.records / response.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation correct",
      response.pagination.pages,
      expectedPages,
    );
  }
  // 6. Validate data array exists
  TestValidator.equals("data array exists", Array.isArray(response.data), true);
  // 7. Validate order summary fields for each order
  for (const order of response.data) {
    typia.assert(order);
    // Required fields validation
    TestValidator.equals("order has id", order.id !== undefined, true);
    TestValidator.equals(
      "order has order_number",
      order.order_number !== undefined,
      true,
    );
    TestValidator.equals("order has status", order.status !== undefined, true);
    TestValidator.equals(
      "order has subtotal",
      order.subtotal !== undefined,
      true,
    );
    TestValidator.equals(
      "order has shipping_cost",
      order.shipping_cost !== undefined,
      true,
    );
    TestValidator.equals(
      "order has total_amount",
      order.total_amount !== undefined,
      true,
    );
    TestValidator.equals(
      "order has created_at",
      order.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "order has customer",
      order.customer !== undefined,
      true,
    );
    TestValidator.equals(
      "order has items_count",
      order.items_count !== undefined,
      true,
    );
    TestValidator.equals(
      "order has shipments_count",
      order.shipments_count !== undefined,
      true,
    );
    // Customer summary validation
    TestValidator.equals(
      "customer has id",
      order.customer.id !== undefined,
      true,
    );
    TestValidator.equals(
      "customer has email",
      order.customer.email !== undefined,
      true,
    );
    TestValidator.equals(
      "customer has profile",
      order.customer.profile !== undefined,
      true,
    );
    TestValidator.equals(
      "customer has status",
      order.customer.status !== undefined,
      true,
    );
    // Profile validation
    TestValidator.equals(
      "profile has display_name",
      order.customer.profile.display_name !== undefined,
      true,
    );
    TestValidator.equals(
      "profile has phone",
      order.customer.profile.phone !== undefined,
      true,
    );
  }
  // 8. Validate sorting by created_at descending (newest first)
  for (let i = 1; i < response.data.length; i++) {
    const currentOrder = response.data[i];
    const previousOrder = response.data[i - 1];
    const currentDate = new Date(currentOrder.created_at);
    const previousDate = new Date(previousOrder.created_at);
    TestValidator.predicate(
      `order ${i} created_at <= order ${i - 1} created_at`,
      currentDate <= previousDate,
    );
  }
}
