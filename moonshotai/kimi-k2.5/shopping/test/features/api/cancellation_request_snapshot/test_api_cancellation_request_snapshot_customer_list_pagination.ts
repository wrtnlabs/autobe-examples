import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_cancellation_requests_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";

/**
 * Test pagination capabilities of the cancellation request snapshot list.
 * When a cancellation request has multiple state changes (status updates,
 * seller responses, etc.), verify that the pagination works correctly with
 * different page sizes. Test navigating through snapshot pages and validate
 * that the total count reflects all historical states. Ensure chronological
 * ordering is maintained across pagination boundaries.
 */
export async function test_api_cancellation_request_snapshot_customer_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create isolated customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  // Authenticate as customer
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // Create a cancellation request to have snapshots
  const cancellationRequest =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {},
    );
  typia.assert(cancellationRequest);
  // Test 1: Pagination with small page size (limit=2)
  const page1 =
    await api.functional.ecommerceMall.customer.cancellation_requests.snapshots.index(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          page: 1,
          limit: 2,
          createdAtFrom: null,
          createdAtTo: null,
          statusBefore: null,
          statusAfter: null,
          sortField: "created_at",
          sortOrder: "desc",
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(page1);
  // Validate page 1 pagination metadata
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 2);
  TestValidator.predicate("page 1 records >= 0", page1.pagination.records >= 0);
  TestValidator.predicate("page 1 pages >= 0", page1.pagination.pages >= 0);
  TestValidator.predicate(
    "page 1 data length <= limit",
    page1.data.length <= 2,
  );
  // Test 2: Navigate to page 2 if multiple pages exist
  if (page1.pagination.pages >= 2) {
    const page2 =
      await api.functional.ecommerceMall.customer.cancellation_requests.snapshots.index(
        customerConnection,
        {
          cancellationRequestId: cancellationRequest.id,
          body: {
            page: 2,
            limit: 2,
            createdAtFrom: null,
            createdAtTo: null,
            statusBefore: null,
            statusAfter: null,
            sortField: "created_at",
            sortOrder: "desc",
          } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
        },
      );
    typia.assert(page2);
    // Validate page 2 metadata
    TestValidator.equals("page 2 current", page2.pagination.current, 2);
    TestValidator.equals("page 2 limit", page2.pagination.limit, 2);
    TestValidator.equals(
      "page 2 records matches total",
      page2.pagination.records,
      page1.pagination.records,
    );
    TestValidator.equals(
      "page 2 pages matches total",
      page2.pagination.pages,
      page1.pagination.pages,
    );
  }
  // Test 3: Different page size (limit=10) validates total count consistency
  const batchLarge =
    await api.functional.ecommerceMall.customer.cancellation_requests.snapshots.index(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          page: 1,
          limit: 10,
          createdAtFrom: null,
          createdAtTo: null,
          statusBefore: null,
          statusAfter: null,
          sortField: "created_at",
          sortOrder: "desc",
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(batchLarge);
  // Validate total records remain consistent across different page sizes
  TestValidator.equals(
    "total records consistency",
    batchLarge.pagination.records,
    page1.pagination.records,
  );
  TestValidator.equals("large page limit", batchLarge.pagination.limit, 10);
  // Test 4: Validate descending chronological ordering (newest first)
  if (batchLarge.data.length > 1) {
    for (let i = 1; i < batchLarge.data.length; i++) {
      const previous = batchLarge.data[i - 1];
      const current = batchLarge.data[i];
      TestValidator.predicate(
        `descending order at index ${i}`,
        new Date(previous.createdAt).getTime() >=
          new Date(current.createdAt).getTime(),
      );
    }
  }
  // Test 5: Test ascending order
  const batchAsc =
    await api.functional.ecommerceMall.customer.cancellation_requests.snapshots.index(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          page: 1,
          limit: 10,
          createdAtFrom: null,
          createdAtTo: null,
          statusBefore: null,
          statusAfter: null,
          sortField: "created_at",
          sortOrder: "asc",
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(batchAsc);
  // Validate ascending chronological ordering (oldest first)
  if (batchAsc.data.length > 1) {
    for (let i = 1; i < batchAsc.data.length; i++) {
      const previous = batchAsc.data[i - 1];
      const current = batchAsc.data[i];
      TestValidator.predicate(
        `ascending order at index ${i}`,
        new Date(previous.createdAt).getTime() <=
          new Date(current.createdAt).getTime(),
      );
    }
  }
  // Validate consistent total records across sort orders
  TestValidator.equals(
    "records count across sort orders",
    batchAsc.pagination.records,
    page1.pagination.records,
  );
}
