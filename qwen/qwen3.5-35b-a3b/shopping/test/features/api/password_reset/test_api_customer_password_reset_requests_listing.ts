import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_password_reset_requests_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>() satisfies string as string,
      referrer: typia.random<string & tags.Format<"uri">>() satisfies string as string,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Test listing password reset requests for customer
  // Test with actorType filter
  const customerResetRequests =
    await api.functional.ecommerceMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          actorType: "customer",
          limit: 10,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(customerResetRequests);
  // 3. Test with requestStatus filter (pending)
  const pendingRequests =
    await api.functional.ecommerceMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          requestStatus: "pending",
          limit: 10,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(pendingRequests);
  // 4. Test with requestStatus filter (used)
  const usedRequests =
    await api.functional.ecommerceMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          requestStatus: "used",
          limit: 10,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(usedRequests);
  // 5. Test with requestStatus filter (expired)
  const expiredRequests =
    await api.functional.ecommerceMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          requestStatus: "expired",
          limit: 10,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(expiredRequests);
  // 6. Test with date range filters
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const dateFilteredRequests =
    await api.functional.ecommerceMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          createdAtFrom: oneWeekAgo.toISOString(),
          createdAtTo: oneWeekFromNow.toISOString(),
          limit: 10,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(dateFilteredRequests);
  // 7. Test pagination - request page 2 with limit 5
  const paginatedRequests =
    await api.functional.ecommerceMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(paginatedRequests);
  // 8. Test default sorting (should be by createdAt descending)
  const sortedRequests =
    await api.functional.ecommerceMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          limit: 10,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(sortedRequests);
  // 9. Test with email filter pattern
  const emailFilteredRequests =
    await api.functional.ecommerceMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          email: customer.email,
          limit: 10,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(emailFilteredRequests);
  // 10. Verify customer can see their own email in results
  if (customerResetRequests.data.length > 0) {
    const hasCustomerEmail = customerResetRequests.data.some(
      (request) => request.email === customer.email,
    );
    TestValidator.predicate(
      "customer can see their own reset requests",
      hasCustomerEmail,
    );
  }
  // 11. Verify pagination structure
  TestValidator.equals(
    "pagination has required fields",
    customerResetRequests.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has current field",
    customerResetRequests.pagination.current !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has limit field",
    customerResetRequests.pagination.limit !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has records field",
    customerResetRequests.pagination.records !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has pages field",
    customerResetRequests.pagination.pages !== undefined,
    true,
  );
  // 12. Verify summary fields in data
  if (customerResetRequests.data.length > 0) {
    const firstRequest = customerResetRequests.data[0];
    typia.assert(firstRequest);
    TestValidator.equals(
      "summary has id field",
      firstRequest.id !== undefined,
      true,
    );
    TestValidator.equals(
      "summary has email field",
      firstRequest.email !== undefined,
      true,
    );
    TestValidator.equals(
      "summary has expired_at field",
      firstRequest.expired_at !== undefined,
      true,
    );
    TestValidator.equals(
      "summary has created_at field",
      firstRequest.created_at !== undefined,
      true,
    );
  }
  // 13. Test sorting order - verify descending order
  if (sortedRequests.data.length > 1) {
    const sortedData = sortedRequests.data;
    for (let i = 1; i < sortedData.length; i++) {
      const prevDate = new Date(sortedData[i - 1].created_at).getTime();
      const currDate = new Date(sortedData[i].created_at).getTime();
      TestValidator.predicate(
        `item ${i} is after item ${i - 1}`,
        prevDate >= currDate,
      );
    }
  }
  // 14. Test pagination metadata values
  TestValidator.predicate(
    "pagination current is valid (>= 1)",
    customerResetRequests.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    customerResetRequests.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is valid",
    customerResetRequests.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    customerResetRequests.pagination.pages >= 0,
  );
}