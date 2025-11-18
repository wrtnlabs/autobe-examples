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

/**
 * Validate that admin cart merge event search supports deterministic sorting
 * and that changing orderBy/orderDirection only affects ordering, not the
 * underlying record set for a fixed filter and pagination window.
 *
 * Business context: Administrators use /shoppingMall/admin/carts/mergeEvents to
 * audit how guest carts are merged into customer carts and to analyze merge
 * quality. For a given set of filters and a fixed page (page=1, limit=50),
 * switching sort options should:
 *
 * - Preserve the same set of merge events (same IDs)
 * - Return them in the requested order by created_at, merged_item_count, or
 *   dropped_item_count, with ascending or descending direction.
 *
 * Steps:
 *
 * 1. Join an admin account via POST /auth/admin/join to obtain an authorized admin
 *    context (token is wired into the connection by the SDK).
 * 2. Call PATCH /shoppingMall/admin/carts/mergeEvents with a base request (page=1,
 *    limit=50) ordered by created_at DESC to obtain a first page of audit
 *    records.
 * 3. Re-query with orderBy="created_at" and orderDirection="asc" and verify that:
 *
 *    - The returned ID set matches the baseline ID set.
 *    - Created_at is in non-decreasing order.
 * 4. Re-query with orderBy="merged_item_count" and orderDirection="desc" and
 *    verify that:
 *
 *    - The returned ID set matches the baseline ID set.
 *    - Merged_item_count is in non-increasing order.
 * 5. Re-query with orderBy="dropped_item_count" and orderDirection="desc" and
 *    verify that:
 *
 *    - The returned ID set matches the baseline ID set.
 *    - Dropped_item_count is in non-increasing order.
 * 6. When the page has 0 or 1 results, ordering checks are vacuously true, but ID
 *    set equality across queries is still asserted.
 */
export async function test_api_admin_cart_merge_events_search_sorting(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authorized admin context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Baseline query: created_at DESC.
  const baseRequest = {
    page: 1,
    limit: 50,
    orderBy: "created_at" as const,
    orderDirection: "desc" as const,
  } satisfies IShoppingMallCartMergeEvent.IRequest;

  const basePage =
    await api.functional.shoppingMall.admin.carts.mergeEvents.patch(
      connection,
      {
        body: baseRequest,
      },
    );
  typia.assert<IPageIShoppingMallCartMergeEvent.ISummary>(basePage);

  const baseEvents = basePage.data;
  const baseIds = baseEvents.map((e) => e.id);
  const sortedBaseIds = [...baseIds].sort();

  // 3. created_at ASC query and validations.
  const ascCreatedRequest = {
    page: baseRequest.page,
    limit: baseRequest.limit,
    orderBy: "created_at" as const,
    orderDirection: "asc" as const,
  } satisfies IShoppingMallCartMergeEvent.IRequest;

  const ascCreatedPage =
    await api.functional.shoppingMall.admin.carts.mergeEvents.patch(
      connection,
      {
        body: ascCreatedRequest,
      },
    );
  typia.assert<IPageIShoppingMallCartMergeEvent.ISummary>(ascCreatedPage);

  const ascEvents = ascCreatedPage.data;
  const ascIds = ascEvents.map((e) => e.id);
  const sortedAscIds = [...ascIds].sort();

  TestValidator.equals(
    "ID set should be identical between created_at desc and asc queries",
    sortedBaseIds,
    sortedAscIds,
  );

  // Verify created_at is non-decreasing in ascEvents.
  if (ascEvents.length > 1) {
    for (let i = 1; i < ascEvents.length; ++i) {
      const prev = ascEvents[i - 1].created_at;
      const curr = ascEvents[i].created_at;
      TestValidator.predicate(
        `created_at ascending ordering at index ${i}`,
        new Date(prev).getTime() <= new Date(curr).getTime(),
      );
    }
  }

  // 4. merged_item_count DESC query and validations.
  const mergedDescRequest = {
    page: baseRequest.page,
    limit: baseRequest.limit,
    orderBy: "merged_item_count" as const,
    orderDirection: "desc" as const,
  } satisfies IShoppingMallCartMergeEvent.IRequest;

  const mergedDescPage =
    await api.functional.shoppingMall.admin.carts.mergeEvents.patch(
      connection,
      {
        body: mergedDescRequest,
      },
    );
  typia.assert<IPageIShoppingMallCartMergeEvent.ISummary>(mergedDescPage);

  const mergedEvents = mergedDescPage.data;
  const mergedIds = mergedEvents.map((e) => e.id);
  const sortedMergedIds = [...mergedIds].sort();

  TestValidator.equals(
    "ID set should be identical between base and merged_item_count desc queries",
    sortedBaseIds,
    sortedMergedIds,
  );

  if (mergedEvents.length > 1) {
    for (let i = 1; i < mergedEvents.length; ++i) {
      const prev = mergedEvents[i - 1];
      const curr = mergedEvents[i];

      TestValidator.predicate(
        `merged_item_count descending ordering at index ${i}`,
        prev.merged_item_count >= curr.merged_item_count,
      );

      if (prev.merged_item_count === curr.merged_item_count) {
        TestValidator.predicate(
          `created_at tie-breaker for equal merged_item_count at index ${i}`,
          new Date(prev.created_at).getTime() <=
            new Date(curr.created_at).getTime(),
        );
      }
    }
  }

  // 5. dropped_item_count DESC query and validations.
  const droppedDescRequest = {
    page: baseRequest.page,
    limit: baseRequest.limit,
    orderBy: "dropped_item_count" as const,
    orderDirection: "desc" as const,
  } satisfies IShoppingMallCartMergeEvent.IRequest;

  const droppedDescPage =
    await api.functional.shoppingMall.admin.carts.mergeEvents.patch(
      connection,
      {
        body: droppedDescRequest,
      },
    );
  typia.assert<IPageIShoppingMallCartMergeEvent.ISummary>(droppedDescPage);

  const droppedEvents = droppedDescPage.data;
  const droppedIds = droppedEvents.map((e) => e.id);
  const sortedDroppedIds = [...droppedIds].sort();

  TestValidator.equals(
    "ID set should be identical between base and dropped_item_count desc queries",
    sortedBaseIds,
    sortedDroppedIds,
  );

  if (droppedEvents.length > 1) {
    for (let i = 1; i < droppedEvents.length; ++i) {
      const prev = droppedEvents[i - 1];
      const curr = droppedEvents[i];

      TestValidator.predicate(
        `dropped_item_count descending ordering at index ${i}`,
        prev.dropped_item_count >= curr.dropped_item_count,
      );

      if (prev.dropped_item_count === curr.dropped_item_count) {
        TestValidator.predicate(
          `created_at tie-breaker for equal dropped_item_count at index ${i}`,
          new Date(prev.created_at).getTime() <=
            new Date(curr.created_at).getTime(),
        );
      }
    }
  }
}
