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
 * Verify admin cart merge event search filtering by actor and cart/actor
 * identifiers.
 *
 * Business goals:
 *
 * - Ensure that PATCH /shoppingMall/admin/carts/mergeEvents respects the
 *   filtering criteria provided in IShoppingMallCartMergeEvent.IRequest.
 * - Confirm that actor-type filters (sourceActorType, targetActorType) and
 *   identifier filters (sourceCartId, targetCartId, sourceGuestuserId,
 *   targetCustomerId) correctly restrict the result set.
 * - Validate that summary-side association projections are self-consistent with
 *   the scalar IDs on each merge event record.
 * - Check that combining filters is monotonic: adding constraints must not
 *   increase the number of returned events.
 *
 * Test strategy:
 *
 * 1. Join an admin using POST /auth/admin/join so subsequent calls run under admin
 *    authorization; rely on the SDK to inject the access token into the
 *    connection.
 * 2. Execute a baseline search with a random IShoppingMallCartMergeEvent.IRequest
 *    (default pagination and broad conditions) to obtain an initial page of
 *    events.
 * 3. If the baseline page is empty, short-circuit the test with a predicate that
 *    allows an empty dataset (nothing to assert about filtering).
 * 4. From the baseline data, pick one representative summary and derive a concrete
 *    filter object:
 *
 *    - Page = 1, limit = a small number (e.g., 20).
 *    - SourceActorType/targetActorType from the sample summary’s
 *         source_actor_type/target_actor_type.
 *    - For each ID field (source_cart_id, target_cart_id, source_guestuser_id,
 *         target_customer_id), if the summary field is non-null/defined, pass
 *         it into the corresponding IRequest filter; otherwise, leave the
 *         filter null.
 * 5. Call the mergeEvents.patch endpoint with this derived filter and assert that
 *    all returned summaries satisfy the expected constraints:
 *
 *    - When sourceActorType is defined in the request, every
 *         summary.source_actor_type matches it.
 *    - When targetActorType is defined, every summary.target_actor_type matches it.
 *    - When an ID filter is defined, the corresponding summary ID field equals that
 *         value.
 * 6. For each returned summary, validate association consistency:
 *
 *    - If sourceGuestuser is present, its id equals source_guestuser_id and that
 *         scalar ID is non-null.
 *    - If targetCustomer is present, its id equals target_customer_id and that
 *         scalar ID is non-null.
 *    - If sourceCart is present, its id equals source_cart_id and that scalar ID is
 *         non-null.
 *    - If targetCart is present, its id equals target_cart_id and that scalar ID is
 *         non-null.
 * 7. To test combinability of filters, perform two additional searches:
 *
 *    - A broad search using only actor-type filters from the sample summary (no ID
 *         filters) and capture its data length.
 *    - A tightened search that reuses the actor-type filters but adds at least one
 *         available ID filter (when any are non-null). Assert that the
 *         tightened search returns a data length less than or equal to the
 *         broad search length.
 * 8. Use typia.assert on all non-void responses to guarantee type correctness, and
 *    TestValidator for length and equality predicates.
 */
export async function test_api_admin_cart_merge_events_filtering_by_actor_and_cart(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain an authorized connection
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Execute a baseline search with a broad random IRequest
  const baselineRequest = typia.random<IShoppingMallCartMergeEvent.IRequest>();

  const baselinePage =
    await api.functional.shoppingMall.admin.carts.mergeEvents.patch(
      connection,
      {
        body: baselineRequest,
      },
    );
  typia.assert<IPageIShoppingMallCartMergeEvent.ISummary>(baselinePage);

  const baselineData = baselinePage.data;

  // 3. If no events exist, there is nothing to validate about filtering.
  if (baselineData.length === 0) {
    TestValidator.predicate("baseline may be empty", true);
    return;
  }

  // 4. Pick a representative event to derive deterministic filters
  const sample = RandomGenerator.pick(baselineData);

  // Build a deterministic, constrained filter based on the sample
  const derivedFilter: IShoppingMallCartMergeEvent.IRequest = {
    page: 1,
    limit: 20,
    orderBy: "created_at",
    orderDirection: "desc",
    sourceActorType: sample.source_actor_type,
    targetActorType: sample.target_actor_type,
    sourceCartId: sample.source_cart_id ?? null,
    targetCartId: sample.target_cart_id ?? null,
    sourceGuestuserId: sample.source_guestuser_id ?? null,
    targetCustomerId: sample.target_customer_id ?? null,
    createdAtFrom: null,
    createdAtTo: null,
    minMergedItemCount: null,
    maxMergedItemCount: null,
    minDroppedItemCount: null,
    maxDroppedItemCount: null,
    reasonQuery: null,
  };

  const filteredPage =
    await api.functional.shoppingMall.admin.carts.mergeEvents.patch(
      connection,
      {
        body: derivedFilter,
      },
    );
  typia.assert<IPageIShoppingMallCartMergeEvent.ISummary>(filteredPage);

  const filteredData = filteredPage.data;

  // 5. Validate that all summaries satisfy the applied filters
  for (const event of filteredData) {
    // Actor type filters: always defined in derivedFilter
    TestValidator.equals(
      "source actor type matches filter",
      event.source_actor_type,
      derivedFilter.sourceActorType,
    );
    TestValidator.equals(
      "target actor type matches filter",
      event.target_actor_type,
      derivedFilter.targetActorType,
    );

    // ID filters: when filter is non-null, returned IDs must match
    if (
      derivedFilter.sourceCartId !== null &&
      derivedFilter.sourceCartId !== undefined
    ) {
      TestValidator.equals(
        "source cart id matches filter",
        event.source_cart_id ?? null,
        derivedFilter.sourceCartId,
      );
    }
    if (
      derivedFilter.targetCartId !== null &&
      derivedFilter.targetCartId !== undefined
    ) {
      TestValidator.equals(
        "target cart id matches filter",
        event.target_cart_id ?? null,
        derivedFilter.targetCartId,
      );
    }
    if (
      derivedFilter.sourceGuestuserId !== null &&
      derivedFilter.sourceGuestuserId !== undefined
    ) {
      TestValidator.equals(
        "source guestuser id matches filter",
        event.source_guestuser_id ?? null,
        derivedFilter.sourceGuestuserId,
      );
    }
    if (
      derivedFilter.targetCustomerId !== null &&
      derivedFilter.targetCustomerId !== undefined
    ) {
      TestValidator.equals(
        "target customer id matches filter",
        event.target_customer_id ?? null,
        derivedFilter.targetCustomerId,
      );
    }

    // 6. Association consistency checks: if association exists, scalar ID
    // must be non-null/defined and equal.
    if (event.sourceGuestuser !== undefined && event.sourceGuestuser !== null) {
      TestValidator.predicate(
        "source_guestuser_id must be non-null when sourceGuestuser is present",
        event.source_guestuser_id !== null &&
          event.source_guestuser_id !== undefined,
      );
      if (
        event.source_guestuser_id !== null &&
        event.source_guestuser_id !== undefined
      ) {
        TestValidator.equals(
          "sourceGuestuser association id matches scalar field",
          event.sourceGuestuser.id,
          event.source_guestuser_id,
        );
      }
    }

    if (event.targetCustomer !== undefined && event.targetCustomer !== null) {
      TestValidator.predicate(
        "target_customer_id must be non-null when targetCustomer is present",
        event.target_customer_id !== null &&
          event.target_customer_id !== undefined,
      );
      if (
        event.target_customer_id !== null &&
        event.target_customer_id !== undefined
      ) {
        TestValidator.equals(
          "targetCustomer association id matches scalar field",
          event.targetCustomer.id,
          event.target_customer_id,
        );
      }
    }

    if (event.sourceCart !== undefined && event.sourceCart !== null) {
      TestValidator.predicate(
        "source_cart_id must be non-null when sourceCart is present",
        event.source_cart_id !== null && event.source_cart_id !== undefined,
      );
      if (event.source_cart_id !== null && event.source_cart_id !== undefined) {
        TestValidator.equals(
          "sourceCart association id matches scalar field",
          event.sourceCart.id,
          event.source_cart_id,
        );
      }
    }

    if (event.targetCart !== undefined && event.targetCart !== null) {
      TestValidator.predicate(
        "target_cart_id must be non-null when targetCart is present",
        event.target_cart_id !== null && event.target_cart_id !== undefined,
      );
      if (event.target_cart_id !== null && event.target_cart_id !== undefined) {
        TestValidator.equals(
          "targetCart association id matches scalar field",
          event.targetCart.id,
          event.target_cart_id,
        );
      }
    }
  }

  // 7. Confirm combinability: broad vs tightened filters
  const broadFilter: IShoppingMallCartMergeEvent.IRequest = {
    page: 1,
    limit: 50,
    orderBy: "created_at",
    orderDirection: "desc",
    sourceActorType: sample.source_actor_type,
    targetActorType: sample.target_actor_type,
  };

  const broadPage =
    await api.functional.shoppingMall.admin.carts.mergeEvents.patch(
      connection,
      {
        body: broadFilter,
      },
    );
  typia.assert<IPageIShoppingMallCartMergeEvent.ISummary>(broadPage);

  const broadCount = broadPage.data.length;

  // Tightened filter reuses actor type filters and adds any available ID
  // filters from the sample. Even if no IDs are non-null, the assertion
  // tightenedCount <= broadCount still logically holds.
  const tightenedFilter: IShoppingMallCartMergeEvent.IRequest = {
    ...broadFilter,
    sourceCartId: sample.source_cart_id ?? null,
    targetCartId: sample.target_cart_id ?? null,
    sourceGuestuserId: sample.source_guestuser_id ?? null,
    targetCustomerId: sample.target_customer_id ?? null,
  };

  const tightenedPage =
    await api.functional.shoppingMall.admin.carts.mergeEvents.patch(
      connection,
      {
        body: tightenedFilter,
      },
    );
  typia.assert<IPageIShoppingMallCartMergeEvent.ISummary>(tightenedPage);

  const tightenedCount = tightenedPage.data.length;

  TestValidator.predicate(
    "tightened filter count must not exceed broad filter count",
    tightenedCount <= broadCount,
  );
}
