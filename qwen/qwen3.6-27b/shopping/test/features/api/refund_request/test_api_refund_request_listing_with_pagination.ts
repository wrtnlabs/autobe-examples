import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformRefundRequest";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer refund request listing with pagination.
 *
 * Validates that an authenticated customer can retrieve their refund requests in paginated format. The customer registers first, then retrieves refund requests without filters to verify pagination metadata and response structure.
 *
 * Ensures that the paginated response includes proper pagination metadata (current page, limit, records, total pages) and that any returned refund request summaries contain all required fields including the seller profile reference.
 *
 * 1. Customer registers with email and password.
 * 2. Customer retrieves refund requests with default pagination parameters.
 * 3. Validates response type and structure with typia.assert.
 * 4. Verifies pagination metadata has valid values (current page, limit, records, total pages).
 */
export async function test_api_refund_request_listing_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformCustomer.IJoin,
  });
  // 2. Retrieve refund requests with default pagination
  const result =
    await api.functional.ecommercePlatform.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommercePlatformRefundRequest.IRequest,
      },
    );
  // 3. Validate response type and structure
  typia.assert(result);
  // 4. Verify pagination metadata has valid values
  TestValidator.predicate(
    "current page is at least 1",
    result.pagination.current >= 1,
  );
  TestValidator.predicate("limit is at least 1", result.pagination.limit >= 1);
  TestValidator.predicate(
    "records count is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    result.pagination.pages >= 0,
  );
  TestValidator.equals("current page is 1", result.pagination.current, 1);
  TestValidator.equals("limit is 10", result.pagination.limit, 10);
}
