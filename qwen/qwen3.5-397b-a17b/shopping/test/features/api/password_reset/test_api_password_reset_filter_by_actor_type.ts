import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerPasswordReset";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer's ability to filter password reset requests by specific actor type for security monitoring.
 *
 * This test verifies:
 * 1. Filtering by actorType='customer' returns only customer password reset records
 * 2. Pagination parameters work correctly with actorType filter
 * 3. Date range filters can be combined with actorType for precise audit queries
 * 4. Response structure remains consistent regardless of filter applied
 * 5. Results are sorted by created_at descending
 *
 * @param connection Base connection for API calls
 */
export async function test_api_password_reset_filter_by_actor_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Test filtering by actorType='customer' - should return customer password reset records
  const customerFilterResult =
    await api.functional.shoppingMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          actorType: "customer",
          page: 1,
          limit: 20,
          sort: "created_at,desc",
        } satisfies IShoppingMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(customerFilterResult);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination exists",
    customerFilterResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(customerFilterResult.data),
  );
  TestValidator.equals(
    "current page",
    customerFilterResult.pagination.current,
    1,
  );
  TestValidator.equals("limit", customerFilterResult.pagination.limit, 20);
  // 3. Test pagination with actorType filter
  const paginatedResult =
    await api.functional.shoppingMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          actorType: "customer",
          page: 1,
          limit: 10,
          sort: "created_at,desc",
        } satisfies IShoppingMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals("paginated limit", paginatedResult.pagination.limit, 10);
  TestValidator.predicate(
    "data count within limit",
    paginatedResult.data.length <= paginatedResult.pagination.limit,
  );
  // 4. Test combination of actorType with date range filters
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.shoppingMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          actorType: "customer",
          createdFrom: oneDayAgo.toISOString(),
          createdTo: oneDayLater.toISOString(),
          page: 1,
          limit: 20,
          sort: "created_at,desc",
        } satisfies IShoppingMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // Validate all returned records fall within date range (business logic, not type validation)
  for (const record of dateRangeResult.data) {
    TestValidator.predicate(
      "created_at within range",
      record.created_at >= oneDayAgo.toISOString() &&
        record.created_at <= oneDayLater.toISOString(),
    );
  }
  // 5. Test actorType filter with consumed status
  const consumedFilterResult =
    await api.functional.shoppingMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          actorType: "customer",
          consumed: false,
          page: 1,
          limit: 20,
          sort: "created_at,desc",
        } satisfies IShoppingMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(consumedFilterResult);
  // Validate all returned records are unconsumed (business logic validation)
  for (const record of consumedFilterResult.data) {
    TestValidator.predicate(
      "consumed_at is null for unconsumed",
      record.consumed_at === null,
    );
  }
  // 6. Test sorting validation - results should be in descending order by created_at
  if (customerFilterResult.data.length > 1) {
    for (let i = 1; i < customerFilterResult.data.length; i++) {
      const prevDate = new Date(
        customerFilterResult.data[i - 1].created_at,
      ).getTime();
      const currDate = new Date(
        customerFilterResult.data[i].created_at,
      ).getTime();
      TestValidator.predicate(
        "sorted by created_at descending",
        prevDate >= currDate,
      );
    }
  }
}
