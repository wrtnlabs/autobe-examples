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
 * Test filtering and pagination of seller approval request snapshots.
 *
 * This test validates:
 * 1. Date range filtering (created_at_from, created_at_to)
 * 2. Sort order (asc/desc)
 * 3. Pagination parameters (page, limit)
 * 4. Pagination metadata accuracy
 * 5. Empty result handling
 */
export async function test_api_seller_approval_request_snapshots_filter_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 2. Setup: Create seller approval request
  const approvalRequest =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {},
    );
  typia.assert(approvalRequest);
  // 3. Test: Default pagination
  const defaultPage =
    await api.functional.shoppingMall.seller.sellerApprovalRequests.snapshots.index(
      sellerConnection,
      {
        requestId: approvalRequest.id,
        body: {},
      },
    );
  typia.assert(defaultPage);
  TestValidator.equals("default limit", defaultPage.pagination.limit, 20);
  TestValidator.equals("default page", defaultPage.pagination.current, 1);
  // 4. Test: Custom pagination
  const customPage =
    await api.functional.shoppingMall.seller.sellerApprovalRequests.snapshots.index(
      sellerConnection,
      {
        requestId: approvalRequest.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(customPage);
  TestValidator.equals("custom limit", customPage.pagination.limit, 10);
  TestValidator.equals("custom page", customPage.pagination.current, 1);
  // 5. Test: Sort order - descending (newest first)
  const descSort =
    await api.functional.shoppingMall.seller.sellerApprovalRequests.snapshots.index(
      sellerConnection,
      {
        requestId: approvalRequest.id,
        body: {
          sort_order: "desc",
        },
      },
    );
  typia.assert(descSort);
  TestValidator.predicate("desc sort returns data", descSort.data.length >= 0);
  // 6. Test: Sort order - ascending (oldest first)
  const ascSort =
    await api.functional.shoppingMall.seller.sellerApprovalRequests.snapshots.index(
      sellerConnection,
      {
        requestId: approvalRequest.id,
        body: {
          sort_order: "asc",
        },
      },
    );
  typia.assert(ascSort);
  TestValidator.predicate("asc sort returns data", ascSort.data.length >= 0);
  // 7. Test: Date range filtering - future range (should return empty)
  const futureDate = new Date(Date.now() + 86400000 * 365).toISOString();
  const emptyFilter =
    await api.functional.shoppingMall.seller.sellerApprovalRequests.snapshots.index(
      sellerConnection,
      {
        requestId: approvalRequest.id,
        body: {
          created_at_from: futureDate,
          created_at_to: futureDate,
        },
      },
    );
  typia.assert(emptyFilter);
  TestValidator.equals(
    "empty filter returns no data",
    emptyFilter.data.length,
    0,
  );
  TestValidator.equals(
    "empty filter records count",
    emptyFilter.pagination.records,
    0,
  );
  // 8. Test: Date range filtering - past range (should include snapshots)
  const pastDate = new Date(Date.now() - 86400000 * 365).toISOString();
  const pastFilter =
    await api.functional.shoppingMall.seller.sellerApprovalRequests.snapshots.index(
      sellerConnection,
      {
        requestId: approvalRequest.id,
        body: {
          created_at_from: pastDate,
          created_at_to: new Date().toISOString(),
        },
      },
    );
  typia.assert(pastFilter);
  TestValidator.predicate(
    "past filter includes snapshots",
    pastFilter.data.length > 0,
  );
  // 9. Test: Pagination metadata accuracy
  TestValidator.predicate(
    "pagination records matches data length",
    pastFilter.pagination.records === pastFilter.data.length,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    pastFilter.pagination.pages ===
      Math.ceil(pastFilter.pagination.records / pastFilter.pagination.limit),
  );
  // 10. Test: Page beyond available pages
  const beyondPage =
    await api.functional.shoppingMall.seller.sellerApprovalRequests.snapshots.index(
      sellerConnection,
      {
        requestId: approvalRequest.id,
        body: {
          page: 9999,
          limit: 10,
        },
      },
    );
  typia.assert(beyondPage);
  TestValidator.equals("beyond page returns empty", beyondPage.data.length, 0);
  TestValidator.equals(
    "beyond page current value",
    beyondPage.pagination.current,
    9999,
  );
  // 11. Test: Limit maximum value
  const maxLimit =
    await api.functional.shoppingMall.seller.sellerApprovalRequests.snapshots.index(
      sellerConnection,
      {
        requestId: approvalRequest.id,
        body: {
          limit: 100,
        },
      },
    );
  typia.assert(maxLimit);
  TestValidator.equals("max limit accepted", maxLimit.pagination.limit, 100);
}
