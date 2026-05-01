import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller refund request listing with pagination validation.
 *
 * Validates that an authenticated seller can retrieve a paginated list of
 * refund requests targeting their products. The test verifies pagination
 * metadata integrity, response structure completeness, and sort order
 * correctness.
 *
 * Refund request summaries include the request ID, associated order item
 * with variant and order details, current approval status, truncated reason
 * preview, submission timestamp, and response timestamp (null for pending
 * requests). The endpoint enforces seller-scoped data ownership isolation.
 *
 * 1. Seller registers and authenticates via authorize_seller_join.
 * 2. Seller requests refund request list with page 1 and limit 20.
 * 3. Validates pagination metadata: current page, limit, records, pages.
 * 4. Validates each summary record contains expected structural fields.
 * 5. Validates responded_at is null for pending requests, non-null otherwise.
 * 6. Validates results are sorted newest-first by created_at descending.
 */
export async function test_api_refund_request_seller_list_paginated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Call refund request listing with explicit pagination
  const result = await api.functional.shoppingMall.seller.refund_requests.index(
    sellerConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallRefundRequest.IRequest,
    },
  );
  typia.assert(result);
  // 3. Validate pagination metadata
  TestValidator.predicate("current page is 1", result.pagination.current === 1);
  TestValidator.predicate("limit is 20", result.pagination.limit === 20);
  TestValidator.predicate(
    "records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages computed from records and limit",
    result.pagination.pages ===
      Math.ceil(result.pagination.records / result.pagination.limit),
  );
  // 4. Validate each refund request summary
  for (const req of result.data) {
    TestValidator.predicate(
      "responded_at is null for pending, non-null otherwise",
      req.status === "pending"
        ? req.responded_at === null
        : req.responded_at !== null,
    );
  }
  // 5. Validate sort order: newest first by created_at
  for (let i = 0; i < result.data.length - 1; i++) {
    TestValidator.predicate(
      "results sorted newest-first by created_at",
      new Date(result.data[i].created_at).getTime() >=
        new Date(result.data[i + 1].created_at).getTime(),
    );
  }
}
