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

export async function test_api_refund_request_admin_search_comprehensive(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Test 1: Basic search with empty criteria
  const emptySearch =
    await api.functional.ecommerce.administrator.refund_requests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.predicate(
    "empty search returns valid pagination",
    emptySearch.pagination.records >= 0 && emptySearch.pagination.pages >= 0,
  );
  // Test 2: Search with text matching
  const textSearch =
    await api.functional.ecommerce.administrator.refund_requests.index(
      adminConnection,
      {
        body: {
          search: RandomGenerator.substring(
            RandomGenerator.paragraph({ sentences: 3 }),
          ),
          page: 1,
          limit: 5,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(textSearch);
  // Test 3: Date range filtering
  const dateSearch =
    await api.functional.ecommerce.administrator.refund_requests.index(
      adminConnection,
      {
        body: {
          requested_at_start: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          requested_at_end: new Date().toISOString(),
          page: 1,
          limit: 8,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(dateSearch);
  // Test 4: Status filtering with null (since valid status values are unknown)
  const statusSearch =
    await api.functional.ecommerce.administrator.refund_requests.index(
      adminConnection,
      {
        body: {
          status: null, // Use null instead of assuming specific status values
          page: 1,
          limit: 15,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(statusSearch);
  // Test 5: Combined filters
  const combinedSearch =
    await api.functional.ecommerce.administrator.refund_requests.index(
      adminConnection,
      {
        body: {
          search: RandomGenerator.substring(
            RandomGenerator.paragraph({ sentences: 2 }),
          ),
          requested_at_start: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          status: null, // Use null instead of assuming status values
          page: 1,
          limit: 20,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(combinedSearch);
  // Test 6: Pagination edge cases
  const largePage =
    await api.functional.ecommerce.administrator.refund_requests.index(
      adminConnection,
      {
        body: {
          page: 1000, // Very high page number
          limit: 5,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(largePage);
  TestValidator.predicate(
    "high page number returns empty or valid data",
    largePage.data.length <= 5,
  );
  // Test 7: Maximum limit
  const maxLimit =
    await api.functional.ecommerce.administrator.refund_requests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100, // Maximum allowed limit
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(maxLimit);
  TestValidator.predicate(
    "max limit returns valid data",
    maxLimit.data.length <= 100,
  );
  // Test 8: Invalid date range (start after end)
  const invalidDateRange =
    await api.functional.ecommerce.administrator.refund_requests.index(
      adminConnection,
      {
        body: {
          requested_at_start: new Date().toISOString(),
          requested_at_end: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(invalidDateRange);
  // Test 9: Empty search term
  const emptyTermSearch =
    await api.functional.ecommerce.administrator.refund_requests.index(
      adminConnection,
      {
        body: {
          search: "",
          page: 1,
          limit: 10,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(emptyTermSearch);
  // Test 10: Undefined status filter
  const undefinedStatusSearch =
    await api.functional.ecommerce.administrator.refund_requests.index(
      adminConnection,
      {
        body: {
          status: undefined,
          page: 1,
          limit: 10,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(undefinedStatusSearch);
}
