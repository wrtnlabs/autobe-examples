import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerApprovalSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerApprovalSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import type { IShoppingMallSellerApprovalSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_seller_approval_requests_create } from "../../../generate/generate_random_shopping_mall_seller_seller_approval_requests_create";
import { prepare_random_shopping_mall_seller_approval_request } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request";

/**
 * Test pagination and date filtering capabilities for seller approval request snapshots.
 *
 * This test validates the snapshot retrieval API for seller approval requests,
 * including pagination parameters, date range filtering, and sort order options.
 */
export async function test_api_seller_approval_request_snapshots_pagination_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 2. Create seller approval request to generate snapshots
  const approvalRequest =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(approvalRequest);
  const requestId = approvalRequest.id;
  // 3. Test default pagination (no parameters)
  const defaultPagination =
    await api.functional.shoppingMall.seller.seller_approval_requests.snapshots.index(
      sellerConnection,
      {
        requestId,
        body: {},
      },
    );
  typia.assert(defaultPagination);
  TestValidator.equals(
    "default page is 1",
    defaultPagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit is 20",
    defaultPagination.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "has at least one snapshot",
    defaultPagination.data.length >= 1,
  );
  // 4. Test custom pagination (page=2, limit=10)
  const customPagination =
    await api.functional.shoppingMall.seller.seller_approval_requests.snapshots.index(
      sellerConnection,
      {
        requestId,
        body: {
          page: 2,
          limit: 10,
        },
      },
    );
  typia.assert(customPagination);
  TestValidator.equals(
    "custom page is 2",
    customPagination.pagination.current,
    2,
  );
  TestValidator.equals(
    "custom limit is 10",
    customPagination.pagination.limit,
    10,
  );
  // 5. Test maximum limit (limit=100)
  const maxLimitPagination =
    await api.functional.shoppingMall.seller.seller_approval_requests.snapshots.index(
      sellerConnection,
      {
        requestId,
        body: {
          limit: 100,
        },
      },
    );
  typia.assert(maxLimitPagination);
  TestValidator.equals(
    "max limit is 100",
    maxLimitPagination.pagination.limit,
    100,
  );
  // 6. Test date range filtering
  const now = new Date();
  const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
  const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day in future
  const dateFiltered =
    await api.functional.shoppingMall.seller.seller_approval_requests.snapshots.index(
      sellerConnection,
      {
        requestId,
        body: {
          created_at_from: pastDate.toISOString(),
          created_at_to: futureDate.toISOString(),
        },
      },
    );
  typia.assert(dateFiltered);
  // Verify all snapshots are within the date range
  for (const snapshot of dateFiltered.data) {
    const snapshotDate = new Date(snapshot.created_at);
    TestValidator.predicate(
      `snapshot ${snapshot.id} created_at >= from`,
      snapshotDate >= pastDate,
    );
    TestValidator.predicate(
      `snapshot ${snapshot.id} created_at <= to`,
      snapshotDate <= futureDate,
    );
  }
  // 7. Test sort order ascending
  const ascSorted =
    await api.functional.shoppingMall.seller.seller_approval_requests.snapshots.index(
      sellerConnection,
      {
        requestId,
        body: {
          sort_order: "asc",
        },
      },
    );
  typia.assert(ascSorted);
  // Verify ascending order (oldest first)
  for (let i = 1; i < ascSorted.data.length; i++) {
    const prevDate = new Date(ascSorted.data[i - 1].created_at);
    const currDate = new Date(ascSorted.data[i].created_at);
    TestValidator.predicate(
      `snapshot ${i} is after snapshot ${i - 1} in asc order`,
      currDate >= prevDate,
    );
  }
  // 8. Test empty result set with future date range
  const futureFrom = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days in future
  const futureTo = new Date(futureFrom.getTime() + 24 * 60 * 60 * 1000);
  const emptyResult =
    await api.functional.shoppingMall.seller.seller_approval_requests.snapshots.index(
      sellerConnection,
      {
        requestId,
        body: {
          created_at_from: futureFrom.toISOString(),
          created_at_to: futureTo.toISOString(),
        },
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals("empty result has 0 data", emptyResult.data.length, 0);
  TestValidator.equals(
    "empty result has 0 records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result has 0 pages",
    emptyResult.pagination.pages,
    0,
  );
  // 9. Verify pagination metadata accuracy
  TestValidator.equals(
    "pagination current matches request",
    defaultPagination.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    defaultPagination.pagination.pages ===
      Math.ceil(
        defaultPagination.pagination.records /
          defaultPagination.pagination.limit,
      ),
  );
}
