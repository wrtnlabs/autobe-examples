import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer order filtering by lifecycle status.
 *
 * Validates that an authenticated customer can filter their order history by specific status values through the PATCH endpoint. Ensures that the status filter parameter performs exact matching against allowed order statuses (paid, shipped, delivered, cancelled, refunded, partially_completed) and that results are properly paginated with correct metadata.
 *
 * Special attention is given to verifying that all returned orders in filtered results possess the matching status value, that pagination metadata fields are present and valid, and that empty result sets return structurally sound responses with null-equivalent data arrays.
 *
 * 1. Customer registers and authenticates via join endpoint.
 * 2. Customer queries orders filtered by status "paid".
 * 3. Validates all returned orders have status "paid".
 * 4. Validates pagination metadata structure.
 * 5. Customer queries orders filtered by status "shipped" to confirm filter variability.
 * 6. Validates consistency of response structure across different filters.
 */
export async function test_api_orders_filter_by_status(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  // 2. Query orders filtered by status "paid"
  const bodyPaid: IEcommercePlatformOrder.IRequest = {
    status: "paid",
    limit: 10,
  };
  const responsePaid =
    await api.functional.ecommercePlatform.customer.orders.index(
      customerConnection,
      { body: bodyPaid },
    );
  typia.assert(responsePaid);
  // 3. Validate all returned orders match the "paid" status filter
  TestValidator.equals(
    "all paid-filtered orders have status paid",
    responsePaid.data.every((order) => order.status === "paid"),
    true,
  );
  // 4. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination current is at least 1",
    responsePaid.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is at least 1",
    responsePaid.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    responsePaid.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    responsePaid.pagination.pages >= 0,
  );
  // 5. Query orders filtered by a different status "shipped"
  const bodyShipped: IEcommercePlatformOrder.IRequest = {
    status: "shipped",
    limit: 5,
  };
  const responseShipped =
    await api.functional.ecommercePlatform.customer.orders.index(
      customerConnection,
      { body: bodyShipped },
    );
  typia.assert(responseShipped);
  // 6. Validate all returned orders match the "shipped" status filter
  TestValidator.equals(
    "all shipped-filtered orders have status shipped",
    responseShipped.data.every((order) => order.status === "shipped"),
    true,
  );
  // 7. Validate pagination metadata for second query
  TestValidator.predicate(
    "shipped pagination current is at least 1",
    responseShipped.pagination.current >= 1,
  );
  TestValidator.predicate(
    "shipped pagination limit is at least 1",
    responseShipped.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "shipped pagination records is non-negative",
    responseShipped.pagination.records >= 0,
  );
}
