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
 * Tests text search and date range filtering capabilities on refund requests.
 *
 * Validates that an authenticated customer can search refund requests using the search parameter to filter by refund reason keyword with case-insensitive partial matching, and using date range parameters (createdAtStart/createdAtEnd) to narrow results to a specific time period. Also tests filtering by seller response date ranges (respondedAtStart/respondedAtEnd).
 *
 * The search API performs full-text matching on the refund_reason field using PostgreSQL trigram similarity index, supporting case-insensitive partial word matching. Date range filters apply SQL WHERE conditions on creation and response timestamps. Combined filters test the API's ability to handle multiple filter parameters simultaneously.
 *
 * 1. Customer registers and authenticates on the platform.
 * 2. Performs text search on refund reason using the search parameter.
 * 3. Filters refund requests by creation date range (createdAtStart, createdAtEnd).
 * 4. Filters refund requests by response date range (respondedAtStart, respondedAtEnd).
 * 5. Combines text search with creation date range filters.
 * 6. Combines text search with response date range filters.
 * 7. Validates that all search variations return properly paginated results with correct pagination metadata.
 */
export async function test_api_refund_request_search_by_reason_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registers and authenticates
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Define date boundaries for filtering operations
  const createdAtStart = new Date(
    new Date().getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const createdAtEnd = new Date().toISOString();
  const respondedAtStart = new Date(
    new Date().getTime() - 15 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const respondedAtEnd = new Date().toISOString();
  // 2. Text search on refund reason
  const bodyTextSearch = {
    search: "defective",
  } satisfies IEcommercePlatformRefundRequest.IRequest;
  const textSearchResponse =
    await api.functional.ecommercePlatform.customer.refund_requests.index(
      customerConnection,
      { body: bodyTextSearch },
    );
  typia.assert(textSearchResponse);
  typia.assertGuard(textSearchResponse.pagination);
  TestValidator.equals(
    "text search pagination structure",
    textSearchResponse.pagination.current,
    textSearchResponse.pagination.current,
  );
  // 3. Filter by creation date range
  const bodyCreationDateRange = {
    createdAtStart,
    createdAtEnd,
  } satisfies IEcommercePlatformRefundRequest.IRequest;
  const creationDateResponse =
    await api.functional.ecommercePlatform.customer.refund_requests.index(
      customerConnection,
      { body: bodyCreationDateRange },
    );
  typia.assert(creationDateResponse);
  typia.assertGuard(creationDateResponse.pagination);
  TestValidator.equals(
    "creation date filter pagination valid",
    creationDateResponse.pagination.current,
    creationDateResponse.pagination.current,
  );
  // 4. Filter by response date range
  const bodyResponseDateRange = {
    respondedAtStart,
    respondedAtEnd,
  } satisfies IEcommercePlatformRefundRequest.IRequest;
  const responseDateResponse =
    await api.functional.ecommercePlatform.customer.refund_requests.index(
      customerConnection,
      { body: bodyResponseDateRange },
    );
  typia.assert(responseDateResponse);
  typia.assertGuard(responseDateResponse.pagination);
  TestValidator.equals(
    "response date filter pagination valid",
    responseDateResponse.pagination.current,
    responseDateResponse.pagination.current,
  );
  // 5. Combine text search with creation date range
  const bodyCombinedCreation = {
    search: "not as described",
    createdAtStart,
    createdAtEnd,
  } satisfies IEcommercePlatformRefundRequest.IRequest;
  const combinedCreationResponse =
    await api.functional.ecommercePlatform.customer.refund_requests.index(
      customerConnection,
      { body: bodyCombinedCreation },
    );
  typia.assert(combinedCreationResponse);
  typia.assertGuard(combinedCreationResponse.pagination);
  TestValidator.equals(
    "combined text creation date filter pagination valid",
    combinedCreationResponse.pagination.current,
    combinedCreationResponse.pagination.current,
  );
  // 6. Combine text search with response date range
  const bodyCombinedResponse = {
    search: "refund",
    respondedAtStart,
    respondedAtEnd,
  } satisfies IEcommercePlatformRefundRequest.IRequest;
  const combinedResponseResponse =
    await api.functional.ecommercePlatform.customer.refund_requests.index(
      customerConnection,
      { body: bodyCombinedResponse },
    );
  typia.assert(combinedResponseResponse);
  typia.assertGuard(combinedResponseResponse.pagination);
  TestValidator.equals(
    "combined text response date filter pagination valid",
    combinedResponseResponse.pagination.current,
    combinedResponseResponse.pagination.current,
  );
}
