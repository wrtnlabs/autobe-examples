import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller refund request list retrieval with filtering and pagination.
 *
 * Validates that sellers can retrieve refund requests for order items with various filter criteria including status filtering, date range filtering, and pagination parameters. The endpoint returns paginated summaries of refund requests matching the filter criteria.
 *
 * Since utility functions for creating order items and refund requests are not available, this test focuses on verifying the endpoint accepts valid filter parameters and returns properly structured responses with correct pagination metadata.
 *
 * 1. Seller authenticates via authorize_seller_join.
 * 2. Generate random orderId and itemId UUIDs for the endpoint path.
 * 3. Test status filtering with 'pending' status only.
 * 4. Test status filtering with 'approved' status only.
 * 5. Test status filtering with 'rejected' status only.
 * 6. Test date range filtering with created_at_from and created_at_to.
 * 7. Test pagination with page and limit parameters.
 * 8. Validate response structure includes pagination metadata and data array.
 */
export async function test_api_seller_refund_request_list_filtered(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Generate random order ID and item ID
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Test status filtering - pending
  const pendingResult =
    await api.functional.ecommerce.seller.orders.items.refund_requests.index(
      sellerConnection,
      {
        orderId,
        itemId,
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(pendingResult);
  TestValidator.equals(
    "pending filter has pagination",
    true,
    pendingResult.pagination !== undefined,
  );
  TestValidator.equals(
    "pending filter has data array",
    true,
    Array.isArray(pendingResult.data),
  );
  // 4. Test status filtering - approved
  const approvedResult =
    await api.functional.ecommerce.seller.orders.items.refund_requests.index(
      sellerConnection,
      {
        orderId,
        itemId,
        body: {
          status: "approved",
          page: 1,
          limit: 10,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(approvedResult);
  TestValidator.equals(
    "approved filter has pagination",
    true,
    approvedResult.pagination !== undefined,
  );
  // 5. Test status filtering - rejected
  const rejectedResult =
    await api.functional.ecommerce.seller.orders.items.refund_requests.index(
      sellerConnection,
      {
        orderId,
        itemId,
        body: {
          status: "rejected",
          page: 1,
          limit: 10,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(rejectedResult);
  TestValidator.equals(
    "rejected filter has pagination",
    true,
    rejectedResult.pagination !== undefined,
  );
  // 6. Test date range filtering
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.ecommerce.seller.orders.items.refund_requests.index(
      sellerConnection,
      {
        orderId,
        itemId,
        body: {
          created_at_from: thirtyDaysAgo.toISOString(),
          created_at_to: now.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.equals(
    "date range filter has pagination",
    true,
    dateRangeResult.pagination !== undefined,
  );
  // 7. Test pagination parameters
  const paginationResult =
    await api.functional.ecommerce.seller.orders.items.refund_requests.index(
      sellerConnection,
      {
        orderId,
        itemId,
        body: {
          page: 2,
          limit: 5,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination page is 2",
    2,
    paginationResult.pagination.current,
  );
  TestValidator.equals(
    "pagination limit is 5",
    5,
    paginationResult.pagination.limit,
  );
  // 8. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination records is non-negative",
    paginationResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    paginationResult.pagination.pages >= 0,
  );
}
