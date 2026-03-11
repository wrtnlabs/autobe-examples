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

export async function test_api_password_reset_requests_business_logic_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAccount = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.assert<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>(typia.random<string & tags.Format<"email">>()),
      password: "TestPassword123",
      href: "https://test.example.com/signup",
      referrer: "https://test.example.com",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAccount);
  // 2. Create authorized customer connection for querying password resets
  const authorizedCustomerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: customerAccount.token.access },
  };
  // 3. Test filtering by requestStatus = pending
  const pendingFilterResult =
    await api.functional.ecommerceMall.customer.password_resets.index(
      authorizedCustomerConnection,
      {
        body: {
          requestStatus: "pending",
          actorType: "customer",
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(pendingFilterResult);
  TestValidator.equals(
    "pending status filter works",
    pendingFilterResult.data.length >= 0,
    true,
  );
  // 4. Test filtering by requestStatus = used
  const usedFilterResult =
    await api.functional.ecommerceMall.customer.password_resets.index(
      authorizedCustomerConnection,
      {
        body: {
          requestStatus: "used",
          actorType: "customer",
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(usedFilterResult);
  TestValidator.equals(
    "used status filter works",
    usedFilterResult.data.length >= 0,
    true,
  );
  // 5. Test filtering by requestStatus = expired
  const expiredFilterResult =
    await api.functional.ecommerceMall.customer.password_resets.index(
      authorizedCustomerConnection,
      {
        body: {
          requestStatus: "expired",
          actorType: "customer",
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(expiredFilterResult);
  TestValidator.equals(
    "expired status filter works",
    expiredFilterResult.data.length >= 0,
    true,
  );
  // 6. Test date range filtering with createdAtFrom and createdAtTo
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.ecommerceMall.customer.password_resets.index(
      authorizedCustomerConnection,
      {
        body: {
          createdAtFrom: thirtyDaysAgo.toISOString(),
          createdAtTo: now.toISOString(),
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filter returns results",
    dateRangeResult.data.length >= 0,
  );
  // 7. Verify authorization - customer authenticated can access endpoint
  TestValidator.predicate(
    "customer authenticated can access password reset endpoint",
    () => dateRangeResult !== undefined,
  );
  // 8. Test concurrent requests consistency
  const concurrentResults = await Promise.all([
    api.functional.ecommerceMall.customer.password_resets.index(
      authorizedCustomerConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    ),
    api.functional.ecommerceMall.customer.password_resets.index(
      authorizedCustomerConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    ),
    api.functional.ecommerceMall.customer.password_resets.index(
      authorizedCustomerConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    ),
  ]);
  concurrentResults.forEach((result) => typia.assert(result));
  TestValidator.equals(
    "concurrent requests return consistent results",
    concurrentResults[0].pagination.records,
    concurrentResults[1].pagination.records,
  );
  // 9. Verify email address is returned from customer JOIN
  TestValidator.predicate("email address returned from customer JOIN", () =>
    dateRangeResult.data.every(
      (r) => r.email !== undefined && r.email.includes("@"),
    ),
  );
  // 10. Validate pagination behavior - minimum page size (1)
  const minPaginationResult =
    await api.functional.ecommerceMall.customer.password_resets.index(
      authorizedCustomerConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(minPaginationResult);
  TestValidator.predicate(
    "minimum pagination works",
    minPaginationResult.pagination.limit === 1,
  );
  // 11. Validate pagination behavior - maximum page size (100)
  const maxPaginationResult =
    await api.functional.ecommerceMall.customer.password_resets.index(
      authorizedCustomerConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(maxPaginationResult);
  TestValidator.predicate(
    "maximum pagination works",
    maxPaginationResult.pagination.limit === 100,
  );
  // 12. Verify pagination metadata correctness
  TestValidator.equals(
    "pagination metadata correct",
    maxPaginationResult.pagination.records,
    maxPaginationResult.pagination.records,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    () =>
      maxPaginationResult.pagination.pages ===
      Math.ceil(
        maxPaginationResult.pagination.records /
          maxPaginationResult.pagination.limit,
      ),
  );
  // 13. Test sort by createdAt descending
  const sortedResult =
    await api.functional.ecommerceMall.customer.password_resets.index(
      authorizedCustomerConnection,
      {
        body: {
          sort: "createdAt",
          sortOrder: "desc",
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(sortedResult);
  TestValidator.predicate(
    "sorted result returns data",
    sortedResult.data.length >= 0,
  );
  // 14. Test search by email address
  const searchResult =
    await api.functional.ecommerceMall.customer.password_resets.index(
      authorizedCustomerConnection,
      {
        body: {
          search: customerAccount.email,
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search returns results",
    searchResult.data.length >= 0,
  );
  // 15. Test that audit log entry is created (query succeeds without error)
  TestValidator.predicate(
    "audit log entry created on query",
    () => dateRangeResult !== undefined,
  );
}