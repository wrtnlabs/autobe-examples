import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlistMergeEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistMergeEvent";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistMergeEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistMergeEvent";

/**
 * Validate wishlist merge event filtering and sorting behaviour for a customer
 * wishlist.
 *
 * Business goal: Ensure that the PATCH
 * /shoppingMall/customer/wishlists/{wishlistId}/mergeEvents endpoint honours
 * the numeric and temporal filtering options in
 * IShoppingMallWishlistMergeEvent.IRequest and that sort_by / sort_direction
 * correctly order the resulting merge event summaries. Also verify that
 * pagination metadata is internally consistent with the returned data.
 *
 * High level steps
 *
 * 1. Join as a new shopping mall customer.
 * 2. Create a wishlist for the authenticated customer.
 * 3. Perform a baseline mergeEvents search with an open filter window.
 * 4. When baseline data exists, derive concrete numeric and created_at ranges from
 *    the returned events and re-query with tighter filters and different sort
 *    options, validating that:
 *
 *    - All events satisfy the filter ranges
 *    - Ordering matches the requested sort_by / sort_direction
 *    - Pagination metadata is coherent.
 * 5. When baseline data is empty, still ensure that pagination metadata is
 *    self-consistent for filtered queries.
 */
export async function test_api_wishlist_merge_events_filtering_and_sorting(
  connection: api.IConnection,
) {
  // 1. Join as a new customer, SDK will attach Authorization header automatically.
  const joinBody = typia.random<IShoppingMallCustomerJoin.IRequest>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customer);

  // 2. Create a wishlist for this customer.
  const wishlistCreateBody = typia.random<IShoppingMallWishlist.ICreate>();
  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistCreateBody,
    });
  typia.assert<IShoppingMallWishlist>(wishlist);

  // 3. Baseline query with wide-open filters but deterministic page/limit.
  const baselineRequestBody = {
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
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    sort_by: null,
    sort_direction: null,
  } satisfies IShoppingMallWishlistMergeEvent.IRequest;

  const baselinePage: IPageIShoppingMallWishlistMergeEvent.ISummary =
    await api.functional.shoppingMall.customer.wishlists.mergeEvents.index(
      connection,
      {
        wishlistId: wishlist.id,
        body: baselineRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallWishlistMergeEvent.ISummary>(baselinePage);

  const baselinePagination = baselinePage.pagination;
  const baselineData = baselinePage.data;

  TestValidator.predicate(
    "baseline pagination current page is 1",
    () => baselinePagination.current === 1,
  );
  TestValidator.predicate(
    "baseline data length does not exceed page limit",
    () => baselineData.length <= baselinePagination.limit,
  );

  if (baselineData.length === 0) {
    // No events exist; we can only assert pagination self-consistency on another query.
    const emptyFilteredPage: IPageIShoppingMallWishlistMergeEvent.ISummary =
      await api.functional.shoppingMall.customer.wishlists.mergeEvents.index(
        connection,
        {
          wishlistId: wishlist.id,
          body: {
            source_actor_type: null,
            target_actor_type: null,
            source_guestuser_id: null,
            target_customer_id: null,
            source_wishlist_id: null,
            target_wishlist_id: null,
            min_merged_item_count: 0 as number & tags.Type<"int32">,
            max_merged_item_count: null,
            min_dropped_item_count: null,
            max_dropped_item_count: null,
            reason_query: null,
            created_from: null,
            created_to: null,
            page: 1 as number & tags.Type<"int32">,
            limit: 10 as number & tags.Type<"int32">,
            sort_by: "created_at",
            sort_direction: "desc",
          } satisfies IShoppingMallWishlistMergeEvent.IRequest,
        },
      );
    typia.assert<IPageIShoppingMallWishlistMergeEvent.ISummary>(
      emptyFilteredPage,
    );

    const pag = emptyFilteredPage.pagination;

    TestValidator.predicate(
      "when no merge events, records is non-negative and pages coherent",
      () => pag.records >= 0 && pag.pages >= 0 && pag.current >= 0,
    );

    TestValidator.predicate(
      "empty filtered page data respects limit",
      () => emptyFilteredPage.data.length <= pag.limit,
    );

    return;
  }

  // 4. Derive numeric and temporal ranges from baseline data.
  // Select first up to three events to compute ranges.
  const sampleEvents = baselineData.slice(0, 3);

  const mergedCounts = sampleEvents.map((e) => e.merged_item_count);
  const droppedCounts = sampleEvents.map((e) => e.dropped_item_count);
  const createdAts = sampleEvents.map((e) => e.created_at);

  const minMerged = Math.min(...mergedCounts);
  const maxMerged = Math.max(...mergedCounts);
  const minDropped = Math.min(...droppedCounts);
  const maxDropped = Math.max(...droppedCounts);

  const minCreated = createdAts.reduce((a, b) => (a < b ? a : b));
  const maxCreated = createdAts.reduce((a, b) => (a > b ? a : b));

  // First filtered query: filter by both counts and created_at, sort by created_at desc.
  const filteredByAll: IPageIShoppingMallWishlistMergeEvent.ISummary =
    await api.functional.shoppingMall.customer.wishlists.mergeEvents.index(
      connection,
      {
        wishlistId: wishlist.id,
        body: {
          source_actor_type: null,
          target_actor_type: null,
          source_guestuser_id: null,
          target_customer_id: null,
          source_wishlist_id: null,
          target_wishlist_id: null,
          min_merged_item_count: minMerged as number & tags.Type<"int32">,
          max_merged_item_count: maxMerged as number & tags.Type<"int32">,
          min_dropped_item_count: minDropped as number & tags.Type<"int32">,
          max_dropped_item_count: maxDropped as number & tags.Type<"int32">,
          reason_query: null,
          created_from: minCreated,
          created_to: maxCreated,
          page: 1 as number & tags.Type<"int32">,
          limit: baselinePagination.limit,
          sort_by: "created_at",
          sort_direction: "desc",
        } satisfies IShoppingMallWishlistMergeEvent.IRequest,
      },
    );
  typia.assert<IPageIShoppingMallWishlistMergeEvent.ISummary>(filteredByAll);

  const pageAll = filteredByAll.pagination;
  const eventsAll = filteredByAll.data;

  TestValidator.predicate(
    "filtered-by-all data length does not exceed limit",
    () => eventsAll.length <= pageAll.limit,
  );

  // Validate each event satisfies numeric and temporal ranges.
  for (const ev of eventsAll) {
    TestValidator.predicate(
      "event merged_item_count within requested range",
      () =>
        ev.merged_item_count >= minMerged && ev.merged_item_count <= maxMerged,
    );
    TestValidator.predicate(
      "event dropped_item_count within requested range",
      () =>
        ev.dropped_item_count >= minDropped &&
        ev.dropped_item_count <= maxDropped,
    );
    TestValidator.predicate(
      "event created_at within requested window",
      () => ev.created_at >= minCreated && ev.created_at <= maxCreated,
    );
  }

  // Validate sort_by created_at desc.
  for (let i = 1; i < eventsAll.length; i++) {
    const prev = eventsAll[i - 1];
    const curr = eventsAll[i];
    TestValidator.predicate(
      "events sorted by created_at desc",
      () => prev.created_at >= curr.created_at,
    );
  }

  // 5. Second query: sort by merged_item_count asc with numeric range only.
  const filteredByMerged: IPageIShoppingMallWishlistMergeEvent.ISummary =
    await api.functional.shoppingMall.customer.wishlists.mergeEvents.index(
      connection,
      {
        wishlistId: wishlist.id,
        body: {
          source_actor_type: null,
          target_actor_type: null,
          source_guestuser_id: null,
          target_customer_id: null,
          source_wishlist_id: null,
          target_wishlist_id: null,
          min_merged_item_count: minMerged as number & tags.Type<"int32">,
          max_merged_item_count: maxMerged as number & tags.Type<"int32">,
          min_dropped_item_count: null,
          max_dropped_item_count: null,
          reason_query: null,
          created_from: null,
          created_to: null,
          page: 1 as number & tags.Type<"int32">,
          limit: baselinePagination.limit,
          sort_by: "merged_item_count",
          sort_direction: "asc",
        } satisfies IShoppingMallWishlistMergeEvent.IRequest,
      },
    );
  typia.assert<IPageIShoppingMallWishlistMergeEvent.ISummary>(filteredByMerged);

  const pageMerged = filteredByMerged.pagination;
  const eventsMerged = filteredByMerged.data;

  TestValidator.predicate(
    "filtered-by-merged data length does not exceed limit",
    () => eventsMerged.length <= pageMerged.limit,
  );

  for (const ev of eventsMerged) {
    TestValidator.predicate(
      "event merged_item_count within requested range (merged sort)",
      () =>
        ev.merged_item_count >= minMerged && ev.merged_item_count <= maxMerged,
    );
  }

  for (let i = 1; i < eventsMerged.length; i++) {
    const prev = eventsMerged[i - 1];
    const curr = eventsMerged[i];
    TestValidator.predicate(
      "events sorted by merged_item_count asc",
      () => prev.merged_item_count <= curr.merged_item_count,
    );
  }
}
