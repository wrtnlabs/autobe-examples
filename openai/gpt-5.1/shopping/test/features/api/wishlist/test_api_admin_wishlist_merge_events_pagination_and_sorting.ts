import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlistMergeEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistMergeEvent";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import type { IShoppingMallWishlistMergeEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistMergeEvent";

/**
 * Validate admin wishlist merge-events pagination, sorting and determinism.
 *
 * Business goals:
 *
 * - Ensure that the admin analytics endpoint for wishlist merge events returns
 *   results sorted correctly by created_at in both descending and ascending
 *   orders.
 * - Verify that pagination metadata (current, limit, records, pages) is
 *   consistent and that requesting out-of-range pages yields an empty data set
 *   without throwing errors.
 * - Confirm that repeated calls with identical query parameters return
 *   deterministic pagination metadata and event id sequences when no new events
 *   are inserted between calls.
 *
 * Steps:
 *
 * 1. Register an admin using /auth/admin/join; SDK automatically stores the access
 *    token in the connection so that admin-scoped APIs are authorized.
 * 2. Call PATCH /shoppingMall/admin/wishlists/mergeEvents with page=1, limit=10,
 *    sort_by="created_at", sort_direction="desc" and validate:
 *
 *    - Pagination.current === 1 and pagination.limit === 10.
 *    - When there are multiple events on page 1, created_at values are in
 *         non-increasing (descending) order.
 * 3. If pagination.pages >= 2, request page=2 with the same sorting and validate:
 *
 *    - Pagination.current === 2 and pagination.limit === 10.
 *    - When both pages have data, events on page 2 are not newer than the oldest
 *         event of page 1 and there is no id overlap between the two pages.
 * 4. If there is at least one record overall, perform an ascending sort request
 *    (page=1, sort_direction="asc") and, when there are multiple events,
 *    validate that created_at values are in non-decreasing order and that the
 *    asc range is consistent with the desc page1 range.
 * 5. If pagination.pages >= 1, request page = pages + 1 and ensure that:
 *
 *    - Pagination.current equals the requested page.
 *    - Pagination.records and pagination.pages are unchanged from the baseline
 *         response.
 *    - Data array is empty.
 * 6. Finally, call the same baseline request twice and assert that both pagination
 *    metadata and the ordered list of event ids are identical to guarantee
 *    deterministic ordering.
 */
export async function test_api_admin_wishlist_merge_events_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Admin join (authentication); SDK will set Authorization header.
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "AdminPassword123!",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // Helper to call mergeEvents.index with a given request body and assert type.
  const search = async (
    body: IShoppingMallWishlistMergeEvent.IRequest,
  ): Promise<IPageIShoppingMallWishlistMergeEvent.ISummary> => {
    const page =
      await api.functional.shoppingMall.admin.wishlists.mergeEvents.index(
        connection,
        { body },
      );
    typia.assert<IPageIShoppingMallWishlistMergeEvent.ISummary>(page);
    return page;
  };

  // Baseline request: first page, limit 10, newest events first by created_at.
  const baseRequest = {
    source_actor_type: null,
    target_actor_type: null,
    source_guestuser_id: null,
    target_customer_id: null,
    source_wishlist_id: null,
    target_wishlist_id: null,
    min_merged_item_count: null,
    max_merged_item_count: null,
    min_dropped_item_count: null,
    max_dropped_item_count: null,
    reason_query: null,
    created_from: null,
    created_to: null,
    page: 1,
    limit: 10,
    sort_by: "created_at",
    sort_direction: "desc",
  } satisfies IShoppingMallWishlistMergeEvent.IRequest;

  const page1 = await search(baseRequest);
  const pagination1 = page1.pagination;
  const data1 = page1.data;

  // Basic pagination assertions for page 1.
  TestValidator.equals("page1 current page is 1", pagination1.current, 1);
  TestValidator.equals("page1 limit is 10", pagination1.limit, 10);

  // If there are multiple events, verify descending order by created_at.
  if (data1.length > 1) {
    for (let i = 1; i < data1.length; i++) {
      const prev = data1[i - 1];
      const curr = data1[i];
      TestValidator.predicate(
        "page1 created_at is non-increasing in desc order",
        prev.created_at >= curr.created_at,
      );
    }
  }

  const totalPages = pagination1.pages;
  const totalRecords = pagination1.records;

  // 2. When a second page exists, verify page 2 ordering and id disjointness.
  if (totalPages >= 2) {
    const page2Request = {
      ...baseRequest,
      page: 2,
    } satisfies IShoppingMallWishlistMergeEvent.IRequest;

    const page2 = await search(page2Request);
    const pagination2 = page2.pagination;
    const data2 = page2.data;

    TestValidator.equals("page2 current page is 2", pagination2.current, 2);
    TestValidator.equals("page2 limit is 10", pagination2.limit, 10);

    if (data1.length > 0 && data2.length > 0) {
      // Every event on page2 should not be newer than the oldest event on page1.
      const newestPage2 = data2[0];
      const oldestPage1 = data1[data1.length - 1];
      TestValidator.predicate(
        "page2 events are not newer than page1 oldest event",
        newestPage2.created_at <= oldestPage1.created_at,
      );

      // Ensure no overlapping ids between page1 and page2.
      const ids1 = data1.map((e) => e.id);
      const ids2 = data2.map((e) => e.id);
      const overlap = ids1.filter((id) => ids2.includes(id));
      TestValidator.equals(
        "no overlapping ids between page1 and page2",
        overlap.length,
        0,
      );
    }
  }

  // 3. Ascending sort check for page 1 when there are any records.
  if (totalRecords > 0) {
    const ascRequest = {
      ...baseRequest,
      sort_direction: "asc",
      page: 1,
    } satisfies IShoppingMallWishlistMergeEvent.IRequest;

    const ascPage1 = await search(ascRequest);
    const ascData1 = ascPage1.data;

    if (ascData1.length > 1) {
      for (let i = 1; i < ascData1.length; i++) {
        const prev = ascData1[i - 1];
        const curr = ascData1[i];
        TestValidator.predicate(
          "ascending created_at order on asc page1",
          prev.created_at <= curr.created_at,
        );
      }

      // Cross-check ranges against descending page1 when we have data there.
      if (data1.length > 0) {
        const descNewest = data1[0];
        const descOldest = data1[data1.length - 1];
        const ascOldest = ascData1[0];
        const ascNewest = ascData1[ascData1.length - 1];

        TestValidator.predicate(
          "asc oldest is not newer than desc newest",
          ascOldest.created_at <= descNewest.created_at,
        );
        TestValidator.predicate(
          "asc newest is not older than desc oldest",
          ascNewest.created_at >= descOldest.created_at,
        );
      }
    }
  }

  // 4. Out-of-range page: request page = pages + 1, expect empty data.
  if (totalPages >= 1) {
    const outOfRangePage = totalPages + 1;
    const outOfRangeRequest = {
      ...baseRequest,
      page: outOfRangePage,
    } satisfies IShoppingMallWishlistMergeEvent.IRequest;

    const outPage = await search(outOfRangeRequest);

    TestValidator.equals(
      "out-of-range page current equals requested page",
      outPage.pagination.current,
      outOfRangePage,
    );
    TestValidator.equals(
      "out-of-range page records unchanged",
      outPage.pagination.records,
      totalRecords,
    );
    TestValidator.equals(
      "out-of-range page total pages unchanged",
      outPage.pagination.pages,
      totalPages,
    );
    TestValidator.equals(
      "out-of-range page returns empty data array",
      outPage.data.length,
      0,
    );
  }

  // 5. Determinism: same request twice should yield identical pagination and ids.
  const repeat1 = await search(baseRequest);
  const repeat2 = await search(baseRequest);

  TestValidator.equals(
    "deterministic pagination for identical requests",
    repeat1.pagination,
    repeat2.pagination,
  );

  const idsRepeat1 = repeat1.data.map((e) => e.id);
  const idsRepeat2 = repeat2.data.map((e) => e.id);
  TestValidator.equals(
    "deterministic id sequence for identical requests",
    idsRepeat1,
    idsRepeat2,
  );
}
