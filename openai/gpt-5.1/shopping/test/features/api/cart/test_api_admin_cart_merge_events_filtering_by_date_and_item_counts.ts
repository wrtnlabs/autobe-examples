import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartMergeEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartMergeEvent";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartMergeEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartMergeEvent";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";

export async function test_api_admin_cart_merge_events_filtering_by_date_and_item_counts(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain Authorization context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Common pagination parameters
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 20 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<200>;

  // 2. Baseline query: broad date window, no item-count filters
  const baseRequest = {
    page,
    limit,
    orderBy: "created_at" as const,
    orderDirection: "desc" as const,
    createdAtFrom: null,
    createdAtTo: null,
    sourceActorType: null,
    targetActorType: null,
    sourceCartId: null,
    targetCartId: null,
    sourceGuestuserId: null,
    targetCustomerId: null,
    minMergedItemCount: null,
    maxMergedItemCount: null,
    minDroppedItemCount: null,
    maxDroppedItemCount: null,
    reasonQuery: null,
  } satisfies IShoppingMallCartMergeEvent.IRequest;

  const baselinePageResult: IPageIShoppingMallCartMergeEvent.ISummary =
    await api.functional.shoppingMall.admin.carts.mergeEvents.patch(
      connection,
      {
        body: baseRequest,
      },
    );
  typia.assert(baselinePageResult);

  const baselinePagination = baselinePageResult.pagination;
  const baselineEvents = baselinePageResult.data;

  // Structural assertions for baseline
  TestValidator.predicate(
    "baseline: pagination current page matches request",
    baselinePagination.current === page,
  );
  TestValidator.predicate(
    "baseline: pagination limit matches request",
    baselinePagination.limit === limit,
  );
  TestValidator.predicate(
    "baseline: records not less than data length",
    baselinePagination.records >= baselineEvents.length,
  );
  TestValidator.predicate(
    "baseline: pages consistent with records",
    (baselinePagination.records === 0 && baselinePagination.pages === 0) ||
      (baselinePagination.records > 0 && baselinePagination.pages >= 1),
  );

  // 3. Date-range + item-count constrained query (only if we have any events)
  let constrainedPageResult: IPageIShoppingMallCartMergeEvent.ISummary | null =
    null;

  if (baselineEvents.length > 0) {
    const refCreatedAt = baselineEvents[0].created_at;

    const constrainedRequest = {
      ...baseRequest,
      createdAtFrom: refCreatedAt,
      createdAtTo: null,
      minMergedItemCount: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
      maxMergedItemCount: null,
      minDroppedItemCount: null,
      maxDroppedItemCount: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    } satisfies IShoppingMallCartMergeEvent.IRequest;

    constrainedPageResult =
      await api.functional.shoppingMall.admin.carts.mergeEvents.patch(
        connection,
        {
          body: constrainedRequest,
        },
      );
    typia.assert(constrainedPageResult);

    const constrainedPagination = constrainedPageResult.pagination;
    const constrainedEvents = constrainedPageResult.data;

    // Structural assertions for constrained response
    TestValidator.predicate(
      "constrained: pagination current page matches request",
      constrainedPagination.current === page,
    );
    TestValidator.predicate(
      "constrained: pagination limit matches request",
      constrainedPagination.limit === limit,
    );
    TestValidator.predicate(
      "constrained: records not less than data length",
      constrainedPagination.records >= constrainedEvents.length,
    );
    TestValidator.predicate(
      "constrained: pages consistent with records",
      (constrainedPagination.records === 0 &&
        constrainedPagination.pages === 0) ||
        (constrainedPagination.records > 0 && constrainedPagination.pages >= 1),
    );

    // Per-event invariants: created_at and item-count thresholds
    for (const event of constrainedEvents) {
      const eventCreatedAt = new Date(event.created_at).getTime();
      const fromTime = new Date(refCreatedAt).getTime();

      TestValidator.predicate(
        "constrained: event created_at is on/after createdAtFrom",
        eventCreatedAt >= fromTime,
      );

      // minMergedItemCount >= 0
      TestValidator.predicate(
        "constrained: merged_item_count >= minMergedItemCount",
        event.merged_item_count >= (constrainedRequest.minMergedItemCount ?? 0),
      );

      if (constrainedRequest.maxDroppedItemCount !== null) {
        TestValidator.predicate(
          "constrained: dropped_item_count <= maxDroppedItemCount",
          event.dropped_item_count <= constrainedRequest.maxDroppedItemCount!,
        );
      }
    }

    // 4. More restrictive filters should not increase result count
    const stricterMinMerged =
      (constrainedRequest.minMergedItemCount ?? 0) +
      (5 as number & tags.Type<"int32"> & tags.Minimum<0>);

    const constrainedMaxDropped =
      constrainedRequest.maxDroppedItemCount ??
      (10 as number & tags.Type<"int32"> & tags.Minimum<0>);

    const stricterMaxDropped =
      constrainedMaxDropped > 0
        ? ((constrainedMaxDropped - 1) as number &
            tags.Type<"int32"> &
            tags.Minimum<0>)
        : constrainedMaxDropped;

    const stricterRequest = {
      ...constrainedRequest,
      minMergedItemCount: stricterMinMerged,
      maxDroppedItemCount: stricterMaxDropped,
    } satisfies IShoppingMallCartMergeEvent.IRequest;

    const stricterPageResult: IPageIShoppingMallCartMergeEvent.ISummary =
      await api.functional.shoppingMall.admin.carts.mergeEvents.patch(
        connection,
        { body: stricterRequest },
      );
    typia.assert(stricterPageResult);

    const stricterPagination = stricterPageResult.pagination;
    const stricterEvents = stricterPageResult.data;

    TestValidator.predicate(
      "stricter: pagination current page matches request",
      stricterPagination.current === page,
    );
    TestValidator.predicate(
      "stricter: pagination limit matches request",
      stricterPagination.limit === limit,
    );
    TestValidator.predicate(
      "stricter: records not less than data length",
      stricterPagination.records >= stricterEvents.length,
    );
    TestValidator.predicate(
      "stricter: pages consistent with records",
      (stricterPagination.records === 0 && stricterPagination.pages === 0) ||
        (stricterPagination.records > 0 && stricterPagination.pages >= 1),
    );

    TestValidator.predicate(
      "stricter: result data length not greater than constrained",
      stricterEvents.length <= constrainedEvents.length,
    );
    TestValidator.predicate(
      "stricter: records not greater than constrained",
      stricterPagination.records <= constrainedPagination.records,
    );
  }

  // 5. No-match scenario using future date range
  const futureFrom = new Date();
  futureFrom.setFullYear(futureFrom.getFullYear() + 2);
  const futureFromIso = futureFrom.toISOString();

  const futureTo = new Date(futureFrom.getTime() + 1000);
  const futureToIso = futureTo.toISOString();

  const futureRequest = {
    ...baseRequest,
    createdAtFrom: futureFromIso,
    createdAtTo: futureToIso,
    minMergedItemCount: null,
    maxMergedItemCount: null,
    minDroppedItemCount: null,
    maxDroppedItemCount: null,
  } satisfies IShoppingMallCartMergeEvent.IRequest;

  const futurePageResult: IPageIShoppingMallCartMergeEvent.ISummary =
    await api.functional.shoppingMall.admin.carts.mergeEvents.patch(
      connection,
      { body: futureRequest },
    );
  typia.assert(futurePageResult);

  const futurePagination = futurePageResult.pagination;
  const futureEvents = futurePageResult.data;

  TestValidator.predicate(
    "future: data is empty when records is zero",
    futurePagination.records === 0 && futureEvents.length === 0,
  );

  TestValidator.predicate(
    "future: records reflect empty dataset",
    futurePagination.records === 0,
  );

  TestValidator.predicate(
    "future: pages for empty dataset is 0 or 1",
    futurePagination.pages === 0 || futurePagination.pages === 1,
  );

  TestValidator.predicate(
    "future: pagination current page matches request",
    futurePagination.current === page,
  );
  TestValidator.predicate(
    "future: pagination limit matches request",
    futurePagination.limit === limit,
  );
}
