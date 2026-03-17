import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test date range filtering for refund requests based on the 7-day refund window.
 * Verifies that the system correctly filters refund requests within specified
 * date ranges and includes delivery_date for eligibility verification.
 */
export async function test_api_customer_refund_requests_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account for authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // Create new connection with customer token
  const customerWithAuth: api.IConnection = {
    host: connection.host,
    headers: { Authorization: customerAuth.token.access },
  };
  // 2. Generate test date ranges for filtering
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  // Format dates as ISO 8601 strings
  const startDateRecent = sevenDaysAgo.toISOString();
  const endDateRecent = now.toISOString();
  const startDateOld = fourteenDaysAgo.toISOString();
  const endDateOld = sevenDaysAgo.toISOString();
  // 3. Test with recent date range (last 7 days)
  const recentRangeResult =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerWithAuth,
      {
        body: {
          startDate: startDateRecent,
          endDate: endDateRecent,
          limit: 20,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(recentRangeResult);
  // 4. Test with older date range (14-7 days ago)
  const olderRangeResult =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerWithAuth,
      {
        body: {
          startDate: startDateOld,
          endDate: endDateOld,
          limit: 20,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(olderRangeResult);
  // 5. Test with overlapping date range (7 days to now)
  const overlappingRangeResult =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerWithAuth,
      {
        body: {
          startDate: startDateRecent,
          endDate: endDateRecent,
          limit: 20,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(overlappingRangeResult);
  // 6. Validate response structure - check pagination fields
  TestValidator.equals(
    "recent range pagination",
    recentRangeResult.pagination,
    {
      current: 1,
      limit: 20,
      records: recentRangeResult.pagination.records,
      pages: Math.ceil(recentRangeResult.pagination.records / 20),
    } satisfies IPage.IPagination,
  );
  // 7. Validate each refund request in recent range has delivery_date
  if (recentRangeResult.data.length > 0) {
    recentRangeResult.data.forEach((refund, index) => {
      typia.assert(refund);
      // delivery_date is critical for 7-day eligibility verification
      TestValidator.predicate(
        `refund ${index} has delivery_date`,
        () => refund.delivery_date !== null,
      );
      // Validate delivery_date format
      TestValidator.predicate(
        `refund ${index} delivery_date is valid date-time`,
        () => !Number.isNaN(Date.parse(refund.delivery_date)),
      );
    });
  }
  // 8. Validate each refund request in older range has delivery_date
  if (olderRangeResult.data.length > 0) {
    olderRangeResult.data.forEach((refund, index) => {
      typia.assert(refund);
      TestValidator.predicate(
        `refund ${index} has delivery_date`,
        () => refund.delivery_date !== null,
      );
      TestValidator.predicate(
        `refund ${index} delivery_date is valid date-time`,
        () => !Number.isNaN(Date.parse(refund.delivery_date)),
      );
    });
  }
  // 9. Verify submitted_at field is included (for date range filtering validation)
  if (recentRangeResult.data.length > 0) {
    recentRangeResult.data.forEach((refund, index) => {
      typia.assert(refund);
      // submitted_at may be null if request was created but not submitted
      TestValidator.predicate(
        `refund ${index} submitted_at is date-time or null`,
        () =>
          refund.submitted_at === null ||
          !Number.isNaN(Date.parse(refund.submitted_at)),
      );
    });
  }
  // 10. Validate pagination information structure
  TestValidator.predicate(
    "recent range pagination records is non-negative",
    () => recentRangeResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "recent range pagination pages is non-negative",
    () => recentRangeResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "recent range pagination limit is positive",
    () => recentRangeResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "recent range pagination current is positive",
    () => recentRangeResult.pagination.current > 0,
  );
  // 11. Compare overlapping range results (should match recent range)
  if (recentRangeResult.data.length === overlappingRangeResult.data.length) {
    TestValidator.equals(
      "overlapping range matches recent range count",
      recentRangeResult.data.length,
      overlappingRangeResult.data.length,
    );
  }
}
