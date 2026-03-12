import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerApprovalSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerApprovalSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import type { IShoppingMallSellerApprovalSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_seller_approval_requests_create } from "../../../generate/generate_random_shopping_mall_seller_seller_approval_requests_create";
import { prepare_random_shopping_mall_seller_approval_request } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request";

/**
 * Test pagination and date range filtering functionality for seller approval request snapshots.
 *
 * This test validates that the snapshots endpoint correctly handles pagination parameters,
 * date range filtering, and sort order for seller approval request audit snapshots.
 */
export async function test_api_seller_approval_request_snapshots_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Setup: Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Setup: Create 3 seller approval requests (each creates 1 snapshot on submission)
  const requests: IShoppingMallSellerApprovalRequest[] = [];
  for (let i = 0; i < 3; i++) {
    const request =
      await generate_random_shopping_mall_seller_seller_approval_requests_create(
        sellerConnection,
        {
          body: {
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    typia.assert(request);
    requests.push(request);
  }
  // Wait a moment to ensure distinct timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 4. Test pagination: page=1, limit=2
  const page1Response =
    await api.functional.shoppingMall.admin.seller_approval_requests.snapshots.index(
      adminConnection,
      {
        requestId: requests[0].id,
        body: {
          page: 1,
          limit: 2,
        },
      },
    );
  typia.assert(page1Response);
  TestValidator.equals(
    "page 1 returns correct count",
    page1Response.data.length,
    Math.min(2, page1Response.pagination.records),
  );
  TestValidator.equals(
    "current page is 1",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals("limit is 2", page1Response.pagination.limit, 2);
  TestValidator.predicate(
    "has correct total records",
    page1Response.pagination.records >= 1,
  );
  // 5. Test pagination: page=2, limit=2 (may return empty if only 1-2 snapshots exist)
  const page2Response =
    await api.functional.shoppingMall.admin.seller_approval_requests.snapshots.index(
      adminConnection,
      {
        requestId: requests[0].id,
        body: {
          page: 2,
          limit: 2,
        },
      },
    );
  typia.assert(page2Response);
  TestValidator.equals(
    "current page is 2",
    page2Response.pagination.current,
    2,
  );
  TestValidator.predicate(
    "page 2 data length is valid",
    page2Response.data.length >= 0 && page2Response.data.length <= 2,
  );
  // 6. Test date range filtering: created_at_from
  const firstSnapshotTime = page1Response.data[0]?.created_at;
  if (firstSnapshotTime) {
    const dateFilterResponse =
      await api.functional.shoppingMall.admin.seller_approval_requests.snapshots.index(
        adminConnection,
        {
          requestId: requests[0].id,
          body: {
            created_at_from: firstSnapshotTime,
          },
        },
      );
    typia.assert(dateFilterResponse);
    TestValidator.predicate(
      "date filter returns snapshots",
      dateFilterResponse.data.length >= 1,
    );
    dateFilterResponse.data.forEach((snapshot) => {
      TestValidator.predicate(
        "snapshot created after filter date",
        snapshot.created_at >= firstSnapshotTime!,
      );
    });
  }
  // 7. Test date range filtering: created_at_from and created_at_to
  if (page1Response.data.length > 0) {
    const lastSnapshotTime =
      page1Response.data[page1Response.data.length - 1].created_at;
    const rangeFilterResponse =
      await api.functional.shoppingMall.admin.seller_approval_requests.snapshots.index(
        adminConnection,
        {
          requestId: requests[0].id,
          body: {
            created_at_from: firstSnapshotTime,
            created_at_to: lastSnapshotTime,
          },
        },
      );
    typia.assert(rangeFilterResponse);
    TestValidator.predicate(
      "range filter returns snapshots",
      rangeFilterResponse.data.length >= 1,
    );
    rangeFilterResponse.data.forEach((snapshot) => {
      TestValidator.predicate(
        "snapshot within date range",
        snapshot.created_at >= firstSnapshotTime! &&
          snapshot.created_at <= lastSnapshotTime,
      );
    });
  }
  // 8. Test sort_order='asc' (oldest first)
  const ascResponse =
    await api.functional.shoppingMall.admin.seller_approval_requests.snapshots.index(
      adminConnection,
      {
        requestId: requests[0].id,
        body: {
          sort_order: "asc",
        },
      },
    );
  typia.assert(ascResponse);
  if (ascResponse.data.length > 1) {
    for (let i = 1; i < ascResponse.data.length; i++) {
      TestValidator.predicate(
        `ascending order: snapshot ${i} >= snapshot ${i - 1}`,
        ascResponse.data[i].created_at >= ascResponse.data[i - 1].created_at,
      );
    }
  }
  // 9. Test sort_order='desc' (newest first)
  const descResponse =
    await api.functional.shoppingMall.admin.seller_approval_requests.snapshots.index(
      adminConnection,
      {
        requestId: requests[0].id,
        body: {
          sort_order: "desc",
        },
      },
    );
  typia.assert(descResponse);
  if (descResponse.data.length > 1) {
    for (let i = 1; i < descResponse.data.length; i++) {
      TestValidator.predicate(
        `descending order: snapshot ${i} <= snapshot ${i - 1}`,
        descResponse.data[i].created_at <= descResponse.data[i - 1].created_at,
      );
    }
  }
  // 10. Verify default sort order (should be desc)
  const defaultResponse =
    await api.functional.shoppingMall.admin.seller_approval_requests.snapshots.index(
      adminConnection,
      {
        requestId: requests[0].id,
        body: {},
      },
    );
  typia.assert(defaultResponse);
  TestValidator.equals(
    "default sort order matches desc",
    defaultResponse.data,
    descResponse.data,
  );
}
