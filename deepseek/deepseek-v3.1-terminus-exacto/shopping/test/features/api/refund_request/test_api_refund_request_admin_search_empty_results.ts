import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test edge cases for refund request filtering including empty results when no matching
 * refund request criteria found. Verify correct pagination behavior when requesting
 * pages with no results and proper handling of zero record scenarios.
 */
export async function test_api_refund_request_admin_search_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.Format<"password">
      >() satisfies string as string,
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // 2. Test invalid status filter (should return empty results)
  const invalidStatusSearch =
    await api.functional.ecommerce.administrator.refund_requests.index(
      adminConnection,
      {
        body: {
          status: "invalid_status_value_xyz" satisfies
            | string
            | null
            | undefined as string | null | undefined,
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(invalidStatusSearch);
  TestValidator.equals(
    "invalid status returns empty array",
    invalidStatusSearch.data.length,
    0,
  );
  TestValidator.equals(
    "invalid status pagination records",
    invalidStatusSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "invalid status pagination pages",
    invalidStatusSearch.pagination.pages,
    0,
  );
  // 3. Test future date range (should return empty results)
  const tomorrow = new Date(Date.now() + 86400000).toISOString();
  const dayAfterTomorrow = new Date(Date.now() + 172800000).toISOString();
  const futureDateSearch =
    await api.functional.ecommerce.administrator.refund_requests.index(
      adminConnection,
      {
        body: {
          requested_at_start: tomorrow satisfies
            | (string & tags.Format<"date-time">)
            | undefined as string | undefined,
          requested_at_end: dayAfterTomorrow satisfies
            | (string & tags.Format<"date-time">)
            | undefined as string | undefined,
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(futureDateSearch);
  TestValidator.equals(
    "future date range returns empty array",
    futureDateSearch.data.length,
    0,
  );
  TestValidator.equals(
    "future date range pagination records",
    futureDateSearch.pagination.records,
    0,
  );
  // 4. Test non-matching search term
  const nonExistentSearchTerm =
    await api.functional.ecommerce.administrator.refund_requests.index(
      adminConnection,
      {
        body: {
          search: "nonexistent_search_term_xyz123" satisfies
            | string
            | undefined as string | undefined,
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(nonExistentSearchTerm);
  TestValidator.equals(
    "non-matching search returns empty array",
    nonExistentSearchTerm.data.length,
    0,
  );
  TestValidator.equals(
    "non-matching search pagination records",
    nonExistentSearchTerm.pagination.records,
    0,
  );
  // 5. Test high page number beyond total records
  const highPageSearch =
    await api.functional.ecommerce.administrator.refund_requests.index(
      adminConnection,
      {
        body: {
          page: 1000 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(highPageSearch);
  TestValidator.equals(
    "high page number returns empty array",
    highPageSearch.data.length,
    0,
  );
  TestValidator.predicate(
    "high page number has valid pagination",
    highPageSearch.pagination.current === 1000 &&
      highPageSearch.pagination.limit === 10,
  );
  // 6. Test reversed date range (start date after end date)
  const today = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const reversedDateSearch =
    await api.functional.ecommerce.administrator.refund_requests.index(
      adminConnection,
      {
        body: {
          requested_at_start: today satisfies
            | (string & tags.Format<"date-time">)
            | undefined as string | undefined,
          requested_at_end: yesterday satisfies
            | (string & tags.Format<"date-time">)
            | undefined as string | undefined,
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(reversedDateSearch);
  TestValidator.equals(
    "reversed date range returns empty array",
    reversedDateSearch.data.length,
    0,
  );
}