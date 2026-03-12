import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test review snapshot pagination and sorting with admin access.
 * Validates that administrators can retrieve review snapshots with proper
 * pagination controls (page, limit) and sorting options (sortBy, sortOrder).
 * Tests multiple pagination scenarios including boundary conditions and
 * different sort orders.
 */
export async function test_api_review_snapshot_admin_access_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin/login",
      referrer: "https://test.com/admin",
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 2. Generate a fake review ID for testing pagination
  const reviewId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Test page=1, limit=10
  const page1Response =
    await api.functional.shoppingMall.admin.reviews.snapshots.index(
      adminConnection,
      {
        reviewId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(page1Response);
  // Verify pagination metadata
  TestValidator.equals("page 1 current", page1Response.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Response.pagination.limit, 10);
  TestValidator.predicate("page 1 has data", page1Response.data.length > 0);
  // 4. Test page=2, limit=10
  const page2Response =
    await api.functional.shoppingMall.admin.reviews.snapshots.index(
      adminConnection,
      {
        reviewId,
        body: {
          page: 2,
          limit: 10,
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(page2Response);
  // Verify pagination metadata
  TestValidator.equals("page 2 current", page2Response.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 10);
  // Verify records and pages consistency
  TestValidator.predicate(
    "total records consistent",
    page1Response.pagination.records === page2Response.pagination.records,
  );
  TestValidator.predicate(
    "total pages consistent",
    page1Response.pagination.pages === page2Response.pagination.pages,
  );
  // 5. Test sortBy='created_at' with sortOrder='asc' (oldest first)
  const ascResponse =
    await api.functional.shoppingMall.admin.reviews.snapshots.index(
      adminConnection,
      {
        reviewId,
        body: {
          page: 1,
          limit: 10,
          sortBy: "created_at",
          sortOrder: "asc",
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(ascResponse);
  // Verify ascending order (if we have multiple snapshots)
  if (ascResponse.data.length > 1) {
    TestValidator.predicate(
      "ascending order - oldest first",
      ascResponse.data[0].created_at <=
        ascResponse.data[ascResponse.data.length - 1].created_at,
    );
  }
  // 6. Test sortBy='created_at' with sortOrder='desc' (newest first, default)
  const descResponse =
    await api.functional.shoppingMall.admin.reviews.snapshots.index(
      adminConnection,
      {
        reviewId,
        body: {
          page: 1,
          limit: 10,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(descResponse);
  // Verify descending order (if we have multiple snapshots)
  if (descResponse.data.length > 1) {
    TestValidator.predicate(
      "descending order - newest first",
      descResponse.data[0].created_at >=
        descResponse.data[descResponse.data.length - 1].created_at,
    );
  }
  // 7. Test pagination when total snapshots exceed limit
  // If we have more than 10 snapshots, page 2 should have different data
  if (page1Response.pagination.records > 10) {
    TestValidator.predicate(
      "page 2 exists when records > limit",
      page2Response.pagination.current <= page2Response.pagination.pages,
    );
    // Verify page 2 data is different from page 1
    const page1Ids = page1Response.data.map((s) => s.id);
    const page2Ids = page2Response.data.map((s) => s.id);
    const hasOverlap = page1Ids.some((id) => page2Ids.includes(id));
    TestValidator.equals("no overlap between pages", hasOverlap, false);
  }
  // 8. Test empty results when page exceeds available pages
  const maxPages = page1Response.pagination.pages;
  if (maxPages > 0) {
    const beyondPageResponse =
      await api.functional.shoppingMall.admin.reviews.snapshots.index(
        adminConnection,
        {
          reviewId,
          body: {
            page: maxPages + 1,
            limit: 10,
          } satisfies IShoppingMallReviewSnapshot.IRequest,
        },
      );
    typia.assert(beyondPageResponse);
    // Verify empty results
    TestValidator.equals(
      "beyond max page returns empty",
      beyondPageResponse.data.length,
      0,
    );
    TestValidator.equals(
      "beyond max page current",
      beyondPageResponse.pagination.current,
      maxPages + 1,
    );
  }
  // 9. Verify default values work (no body parameters)
  const defaultResponse =
    await api.functional.shoppingMall.admin.reviews.snapshots.index(
      adminConnection,
      {
        reviewId,
        body: {} satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(defaultResponse);
  // Verify defaults: page=1, limit=20
  TestValidator.equals(
    "default page is 1",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit is 20",
    defaultResponse.pagination.limit,
    20,
  );
}
