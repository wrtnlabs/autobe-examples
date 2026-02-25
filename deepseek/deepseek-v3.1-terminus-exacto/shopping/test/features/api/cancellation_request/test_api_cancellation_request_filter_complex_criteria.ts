import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_cancellation_request_filter_complex_criteria(
  connection: api.IConnection,
): Promise<void> {
  // Setup administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerce.auth.administrator.join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Test various filter combinations
  // Test 1: Filter by status only
  const statusFilter =
    await api.functional.ecommerce.administrator.cancellation_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceCancellationRequest.IRequest,
      },
    );
  typia.assert(statusFilter);
  TestValidator.predicate(
    "status filter returns pagination",
    statusFilter.pagination !== undefined,
  );
  // Test 2: Filter by customer_id and status
  const customerStatusFilter =
    await api.functional.ecommerce.administrator.cancellation_requests.index(
      adminConnection,
      {
        body: {
          customer_id: null,
          status: "approved",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceCancellationRequest.IRequest,
      },
    );
  typia.assert(customerStatusFilter);
  // Test 3: Filter by date range
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const dateFilter =
    await api.functional.ecommerce.administrator.cancellation_requests.index(
      adminConnection,
      {
        body: {
          date_from: yesterday,
          date_to: tomorrow,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceCancellationRequest.IRequest,
      },
    );
  typia.assert(dateFilter);
  // Test 4: Filter by search text
  const searchFilter =
    await api.functional.ecommerce.administrator.cancellation_requests.index(
      adminConnection,
      {
        body: {
          search: RandomGenerator.alphabets(5),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceCancellationRequest.IRequest,
      },
    );
  typia.assert(searchFilter);
  // Test 5: Complex multi-criteria filter
  const complexFilter =
    await api.functional.ecommerce.administrator.cancellation_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          date_from: yesterday,
          search: RandomGenerator.alphabets(6),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        } satisfies IEcommerceCancellationRequest.IRequest,
      },
    );
  typia.assert(complexFilter);
  TestValidator.predicate(
    "complex filter has valid pagination",
    complexFilter.pagination.current >= 1 &&
      complexFilter.pagination.limit <= 100,
  );
  // Test 6: Empty result set with specific filters
  const futureDate = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const emptyFilter =
    await api.functional.ecommerce.administrator.cancellation_requests.index(
      adminConnection,
      {
        body: {
          date_from: futureDate,
          status: "pending",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceCancellationRequest.IRequest,
      },
    );
  typia.assert(emptyFilter);
  TestValidator.predicate(
    "empty filter returns valid structure",
    Array.isArray(emptyFilter.data) && emptyFilter.pagination.records >= 0,
  );
  // Test 7: Pagination with filters
  const paginationTest =
    await api.functional.ecommerce.administrator.cancellation_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceCancellationRequest.IRequest,
      },
    );
  typia.assert(paginationTest);
  TestValidator.predicate(
    "pagination page number valid",
    paginationTest.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    paginationTest.pagination.limit >= 1 &&
      paginationTest.pagination.limit <= 100,
  );
}
