import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPostPurchaseRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPostPurchaseRefundRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPostPurchaseRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseRefundRequest";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator filtering of refund requests by creation date range.
 *
 * Validates the admin's ability to filter post-purchase refund requests using date range parameters. Tests three filtering scenarios: greater-than-or-equal (gte) filter, less-than-or-equal (lte) filter, and combined date range filtering. Ensures that the API correctly returns only refund requests matching the specified date criteria and that pagination metadata accurately reflects the filtered result counts.
 *
 * The test authenticates as an administrator and queries the refund requests endpoint with various date filter combinations. Each filter scenario validates that returned requests fall within the expected date boundaries and that the pagination information (current page, total records, total pages) correctly represents the filtered dataset.
 *
 * 1. Administrator authentication via join operation.
 * 2. Query refund requests with created_at.gte filter to get requests from a specific date onward.
 * 3. Validate all returned requests have created_at >= specified date.
 * 4. Query refund requests with created_at.lte filter to get requests before a specific date.
 * 5. Validate all returned requests have created_at <= specified date.
 * 6. Query refund requests with combined gte and lte filters for a date range.
 * 7. Validate all returned requests fall within the specified date range.
 * 8. Verify pagination metadata (current, limit, records, pages) is accurate for each filtered query.
 */
export async function test_api_refund_request_admin_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Test created_at.gte filter - requests from a specific date onward
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const gteDate = sevenDaysAgo.toISOString();
  const gteResult =
    await api.functional.shoppingMall.admin.post_purchase.refund_requests.index(
      adminConnection,
      {
        body: {
          created_at: { gte: gteDate },
          page: 1,
          limit: 10,
        } satisfies IShoppingMallPostPurchaseRefundRequest.IRequest,
      },
    );
  typia.assert(gteResult);
  // Validate all returned requests have created_at >= gteDate
  for (const request of gteResult.data) {
    TestValidator.predicate(
      "gte filter - request created after or on date",
      new Date(request.created_at).getTime() >= new Date(gteDate).getTime(),
    );
  }
  // Validate pagination metadata for gte filter
  TestValidator.predicate(
    "gte filter - current page is 1",
    gteResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "gte filter - limit is 10",
    gteResult.pagination.limit === 10,
  );
  TestValidator.predicate(
    "gte filter - records count is non-negative",
    gteResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "gte filter - pages calculated correctly",
    gteResult.pagination.pages === Math.ceil(gteResult.pagination.records / 10),
  );
  // 3. Test created_at.lte filter - requests before a specific date
  const futureDate = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const lteResult =
    await api.functional.shoppingMall.admin.post_purchase.refund_requests.index(
      adminConnection,
      {
        body: {
          created_at: { lte: futureDate },
          page: 1,
          limit: 10,
        } satisfies IShoppingMallPostPurchaseRefundRequest.IRequest,
      },
    );
  typia.assert(lteResult);
  // Validate all returned requests have created_at <= lteDate
  for (const request of lteResult.data) {
    TestValidator.predicate(
      "lte filter - request created before or on date",
      new Date(request.created_at).getTime() <= new Date(futureDate).getTime(),
    );
  }
  // Validate pagination metadata for lte filter
  TestValidator.predicate(
    "lte filter - current page is 1",
    lteResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "lte filter - limit is 10",
    lteResult.pagination.limit === 10,
  );
  TestValidator.predicate(
    "lte filter - records count is non-negative",
    lteResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "lte filter - pages calculated correctly",
    lteResult.pagination.pages === Math.ceil(lteResult.pagination.records / 10),
  );
  // 4. Test combined gte and lte filters - requests within a date range
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const rangeGte = fourteenDaysAgo.toISOString();
  const rangeLte = now.toISOString();
  const rangeResult =
    await api.functional.shoppingMall.admin.post_purchase.refund_requests.index(
      adminConnection,
      {
        body: {
          created_at: { gte: rangeGte, lte: rangeLte },
          page: 1,
          limit: 10,
        } satisfies IShoppingMallPostPurchaseRefundRequest.IRequest,
      },
    );
  typia.assert(rangeResult);
  // Validate all returned requests fall within the date range
  for (const request of rangeResult.data) {
    const requestTime = new Date(request.created_at).getTime();
    TestValidator.predicate(
      "range filter - request created after or on start date",
      requestTime >= new Date(rangeGte).getTime(),
    );
    TestValidator.predicate(
      "range filter - request created before or on end date",
      requestTime <= new Date(rangeLte).getTime(),
    );
  }
  // Validate pagination metadata for range filter
  TestValidator.predicate(
    "range filter - current page is 1",
    rangeResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "range filter - limit is 10",
    rangeResult.pagination.limit === 10,
  );
  TestValidator.predicate(
    "range filter - records count is non-negative",
    rangeResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "range filter - pages calculated correctly",
    rangeResult.pagination.pages ===
      Math.ceil(rangeResult.pagination.records / 10),
  );
}
