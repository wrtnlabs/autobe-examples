import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

/**
 * Tests pagination navigation through refund request snapshot history.
 * Validates: (1) initial snapshot created with refund request, (2) additional
 * snapshot created when seller responds, (3) pagination metadata accuracy,
 * (4) navigation between pages, (5) descending sort order by created_at.
 */
export async function test_api_seller_refund_request_snapshot_pagination_navigation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as customer and create refund request
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // Create refund request (creates initial snapshot)
  const refundRequest =
    await generate_random_ecommerce_mall_customer_refund_requests_create(
      customerConnection,
      {},
    );
  typia.assert(refundRequest);
  // Step 2: Authenticate as seller and respond to refund request
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // Seller responds (creates additional snapshot)
  const responseBody = {
    status: "approved" as const,
    responseReason: "Refund approved per policy",
  } satisfies IEcommerceMallRefundRequest.IUpdate;
  const updatedRefundRequest =
    await api.functional.ecommerceMall.seller.refund_requests.update(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: responseBody,
      },
    );
  typia.assert(updatedRefundRequest);
  // Step 3: Query first page with limit=1
  const firstPageBody = {
    status: null,
    reason: null,
    responseReason: null,
    createdAtFrom: null,
    createdAtTo: null,
    page: 1,
    limit: 1,
  } satisfies IEcommerceMallRefundRequestSnapshot.IRequest;
  const firstPage: IPageIEcommerceMallRefundRequestSnapshot =
    await api.functional.ecommerceMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: firstPageBody,
      },
    );
  typia.assert(firstPage);
  // Step 4: Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", firstPage.pagination.limit, 1);
  TestValidator.equals("pagination records", firstPage.pagination.records, 2);
  TestValidator.equals("pagination pages", firstPage.pagination.pages, 2);
  TestValidator.equals("first page data length", firstPage.data.length, 1);
  // Step 5: Navigate to second page
  const secondPageBody = {
    status: null,
    reason: null,
    responseReason: null,
    createdAtFrom: null,
    createdAtTo: null,
    page: 2,
    limit: 1,
  } satisfies IEcommerceMallRefundRequestSnapshot.IRequest;
  const secondPage: IPageIEcommerceMallRefundRequestSnapshot =
    await api.functional.ecommerceMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: secondPageBody,
      },
    );
  typia.assert(secondPage);
  // Step 6: Validate second page pagination and data
  TestValidator.equals(
    "second page current page",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals("second page data length", secondPage.data.length, 1);
  // Step 7: Verify descending sort order (newest first)
  // First page should have newer snapshot (seller response), second page should have older (initial)
  const firstSnapshot = firstPage.data[0]!;
  const secondSnapshot = secondPage.data[0]!;
  TestValidator.predicate(
    "first page snapshot is newer than second page",
    new Date(firstSnapshot.createdAt).getTime() >
      new Date(secondSnapshot.createdAt).getTime(),
  );
  // Verify the response snapshot is on first page (it was created after the initial snapshot)
  TestValidator.equals(
    "first page snapshot has approved status",
    firstSnapshot.status,
    "approved",
  );
  TestValidator.equals(
    "second page snapshot has pending status",
    secondSnapshot.status,
    "pending",
  );
  // Verify all expected properties exist
  TestValidator.equals(
    "first page snapshot has refundRequestId",
    firstSnapshot.refundRequestId,
    refundRequest.id,
  );
  TestValidator.equals(
    "second page snapshot has refundRequestId",
    secondSnapshot.refundRequestId,
    refundRequest.id,
  );
}
