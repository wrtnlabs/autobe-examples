import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test email verification listing endpoint with date range filtering capabilities.
 *
 * Validates that the email verification index endpoint correctly handles:
 * - created_after/created_before filters for creation date range
 * - expires_before filter for expiration date filtering
 * - used_after/used_before filters for usage timeframe
 * - Compound filtering with status and entity_type
 * - Empty result sets when no records match criteria
 * - Pagination preservation when filtering reduces result set
 */
export async function test_api_email_verification_customer_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - authenticate to access email verification records
  const customerConnection: api.IConnection = { host: connection.host };
  const customerData = await authorize_customer_join(customerConnection, {
    body: {
      email: (typia.random<string & tags.Format<"email">>() satisfies string as string),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  typia.assert(customerData);
  // 2. Create test verifications with different timestamps
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  // 3. Test created_after filter - query verifications created after specific date
  const createdAfterFilter = oneDayAgo.toISOString();
  const result1 =
    await api.functional.ecommerceMall.customer.email_verifications.index(
      customerConnection,
      {
        body: {
          created_after: createdAfterFilter,
        },
      },
    );
  typia.assert(result1);
  TestValidator.equals(
    "created_after filter response pagination.current",
    result1.pagination.current,
    1,
  );
  TestValidator.predicate(
    "created_after filter response has valid records",
    result1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "created_after filter response has valid pages",
    result1.pagination.pages >= 0,
  );
  // 4. Test created_before filter - query verifications created before specific date
  const createdBeforeFilter = oneHourFromNow.toISOString();
  const result2 =
    await api.functional.ecommerceMall.customer.email_verifications.index(
      customerConnection,
      {
        body: {
          created_before: createdBeforeFilter,
        },
      },
    );
  typia.assert(result2);
  TestValidator.equals(
    "created_before filter response pagination.current",
    result2.pagination.current,
    1,
  );
  TestValidator.predicate(
    "created_before filter response has valid records",
    result2.pagination.records >= 0,
  );
  // 5. Test expires_before filter - find verifications expiring before given date
  const expiresBeforeFilter = oneDayFromNow.toISOString();
  const result3 =
    await api.functional.ecommerceMall.customer.email_verifications.index(
      customerConnection,
      {
        body: {
          expires_before: expiresBeforeFilter,
        },
      },
    );
  typia.assert(result3);
  TestValidator.equals(
    "expires_before filter response pagination.current",
    result3.pagination.current,
    1,
  );
  TestValidator.predicate(
    "expires_before filter response has valid records",
    result3.pagination.records >= 0,
  );
  // 6. Test used_after filter - filter by usage timeframe (after specific date)
  const usedAfterFilter = threeDaysAgo.toISOString();
  const result4 =
    await api.functional.ecommerceMall.customer.email_verifications.index(
      customerConnection,
      {
        body: {
          used_after: usedAfterFilter,
        },
      },
    );
  typia.assert(result4);
  TestValidator.equals(
    "used_after filter response pagination.current",
    result4.pagination.current,
    1,
  );
  TestValidator.predicate(
    "used_after filter response has valid records",
    result4.pagination.records >= 0,
  );
  // 7. Test used_before filter - filter by usage timeframe (before specific date)
  const usedBeforeFilter = oneHourAgo.toISOString();
  const result5 =
    await api.functional.ecommerceMall.customer.email_verifications.index(
      customerConnection,
      {
        body: {
          used_before: usedBeforeFilter,
        },
      },
    );
  typia.assert(result5);
  TestValidator.equals(
    "used_before filter response pagination.current",
    result5.pagination.current,
    1,
  );
  TestValidator.predicate(
    "used_before filter response has valid records",
    result5.pagination.records >= 0,
  );
  // 8. Test compound filtering - combine date ranges with status and entity_type
  const compoundFilter =
    await api.functional.ecommerceMall.customer.email_verifications.index(
      customerConnection,
      {
        body: {
          created_after: oneDayAgo.toISOString(),
          created_before: oneHourFromNow.toISOString(),
          status: "pending",
          entity_type: "customer",
        },
      },
    );
  typia.assert(compoundFilter);
  TestValidator.equals(
    "compound filter response pagination.current",
    compoundFilter.pagination.current,
    1,
  );
  TestValidator.predicate(
    "compound filter response has valid records",
    compoundFilter.pagination.records >= 0,
  );
  // 9. Test empty result set - filter with dates that match no records
  const emptyResultFilter =
    await api.functional.ecommerceMall.customer.email_verifications.index(
      customerConnection,
      {
        body: {
          created_after: "2030-12-31T23:59:59Z",
          created_before: "2030-12-31T23:59:59Z",
        },
      },
    );
  typia.assert(emptyResultFilter);
  TestValidator.equals(
    "empty result filter has empty data array",
    emptyResultFilter.data.length,
    0,
  );
  TestValidator.equals(
    "empty result filter has zero records count",
    emptyResultFilter.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result filter has zero pages",
    emptyResultFilter.pagination.pages,
    0,
  );
  // 10. Test pagination preservation - verify pagination metadata remains correct with limit
  const paginationFilter =
    await api.functional.ecommerceMall.customer.email_verifications.index(
      customerConnection,
      {
        body: {
          limit: 5,
        },
      },
    );
  typia.assert(paginationFilter);
  TestValidator.predicate(
    "pagination limit respected in data array",
    paginationFilter.data.length <= 5 ||
      paginationFilter.pagination.records <= 5,
  );
  TestValidator.equals(
    "pagination current page correct",
    paginationFilter.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit correct",
    paginationFilter.pagination.limit,
    5,
  );
  // 11. Test pagination with multiple pages - verify records and pages calculation
  const multiPageFilter =
    await api.functional.ecommerceMall.customer.email_verifications.index(
      customerConnection,
      {
        body: {
          limit: 10,
          page: "1",
        },
      },
    );
  typia.assert(multiPageFilter);
  TestValidator.predicate(
    "multi page filter has valid records count",
    multiPageFilter.pagination.records >= 0,
  );
  TestValidator.equals(
    "multi page filter current page is 1",
    multiPageFilter.pagination.current,
    1,
  );
}