import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSubscriptionPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSubscriptionPlan";
import type { IShoppingMallSellerSubscriptionPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscriptionPlan";

export async function test_api_seller_subscription_plans_text_search_by_name(
  connection: api.IConnection,
) {
  /**
   * Validate free-text and name-based search for seller subscription plans.
   *
   * Business goal
   *
   * - Ensure that PATCH /shoppingMall/sellerSubscriptionPlans correctly narrows
   *   results when using the `search` (free-text) and `name` filters, based on
   *   the human readable plan name.
   *
   * High-level scenario
   *
   * 1. Discover a concrete seller subscription plan to obtain a realistic `name`.
   * 2. Extract a non-trivial fragment from that name to use as a search term.
   * 3. Call the list endpoint with the fragment as `search` only and validate that
   *    all returned summaries contain the fragment in `name`
   *    (case-insensitive).
   * 4. Call the list endpoint with the fragment as `name` only and perform the
   *    same validation.
   * 5. Call the list endpoint with both `search` and `name` set to the fragment
   *    and validate that the result set is not broader than each individual
   *    filter.
   * 6. Additionally verify basic pagination invariants for the chosen request.
   */

  // Helper: case-insensitive substring check for names
  const containsFragment = (name: string, fragment: string): boolean => {
    const lowerName = name.toLowerCase();
    const lowerFragment = fragment.toLowerCase();
    return lowerName.includes(lowerFragment);
  };

  // Step 1: Get a reference plan to derive a meaningful name fragment.
  // We use typia.random<string>() as a business code; in real test beds this
  // would be backed by fixtures or seed data. Even if the particular GET call
  // fails at runtime in some environments, the primary focus of this test is
  // the search behavior, not the exact fixture wiring.
  const referencePlan: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.sellerSubscriptionPlans.at(connection, {
      planCode: typia.random<string>(),
    });
  typia.assert(referencePlan);

  // Derive a non-trivial fragment from the plan name. Use RandomGenerator
  // substring utility to ensure we get a mid-sized token rather than the full
  // name.
  const rawName: string = referencePlan.name;
  const fallbackFragment: string =
    rawName.length > 3 ? rawName.substring(0, 3) : rawName;
  const fragmentSource: string =
    rawName.length > 0 ? rawName : RandomGenerator.paragraph({ sentences: 2 });
  const searchFragment: string =
    fragmentSource.length > 0
      ? RandomGenerator.substring(fragmentSource)
      : fallbackFragment;

  // Ensure the fragment is non-empty and trimmed for clean comparisons.
  const trimmedFragment: string = searchFragment.trim().length
    ? searchFragment.trim()
    : fallbackFragment.trim();

  // Step 2: Perform search using `search` only.
  const searchOnlyRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    search: trimmedFragment,
  } satisfies IShoppingMallSellerSubscriptionPlan.IRequest;

  const searchOnlyPage: IPageIShoppingMallSellerSubscriptionPlan.ISummary =
    await api.functional.shoppingMall.sellerSubscriptionPlans.index(
      connection,
      {
        body: searchOnlyRequest,
      },
    );
  typia.assert<IPageIShoppingMallSellerSubscriptionPlan.ISummary>(
    searchOnlyPage,
  );

  // Basic pagination invariants
  const paginationSearchOnly = searchOnlyPage.pagination;
  TestValidator.equals(
    "search-only: current page equals requested page",
    paginationSearchOnly.current,
    searchOnlyRequest.page ?? 1,
  );
  TestValidator.equals(
    "search-only: limit equals requested limit",
    paginationSearchOnly.limit,
    searchOnlyRequest.limit ?? 20,
  );

  // If there is at least one result, ensure its name contains the fragment
  if (searchOnlyPage.data.length > 0) {
    for (const summary of searchOnlyPage.data) {
      TestValidator.predicate(
        "search-only: summary.name contains search fragment (case-insensitive)",
        containsFragment(summary.name, trimmedFragment),
      );
    }
  }

  // Step 3: Perform search using `name` only.
  const nameOnlyRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    name: trimmedFragment,
  } satisfies IShoppingMallSellerSubscriptionPlan.IRequest;

  const nameOnlyPage: IPageIShoppingMallSellerSubscriptionPlan.ISummary =
    await api.functional.shoppingMall.sellerSubscriptionPlans.index(
      connection,
      {
        body: nameOnlyRequest,
      },
    );
  typia.assert<IPageIShoppingMallSellerSubscriptionPlan.ISummary>(nameOnlyPage);

  const paginationNameOnly = nameOnlyPage.pagination;
  TestValidator.equals(
    "name-only: current page equals requested page",
    paginationNameOnly.current,
    nameOnlyRequest.page ?? 1,
  );
  TestValidator.equals(
    "name-only: limit equals requested limit",
    paginationNameOnly.limit,
    nameOnlyRequest.limit ?? 20,
  );

  if (nameOnlyPage.data.length > 0) {
    for (const summary of nameOnlyPage.data) {
      TestValidator.predicate(
        "name-only: summary.name contains name fragment (case-insensitive)",
        containsFragment(summary.name, trimmedFragment),
      );
    }
  }

  // Step 4: Perform search using both `search` and `name` to ensure the
  // combination does not broaden results unexpectedly. We compare the
  // intersection sizes where both have non-empty datasets.
  const combinedRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    search: trimmedFragment,
    name: trimmedFragment,
  } satisfies IShoppingMallSellerSubscriptionPlan.IRequest;

  const combinedPage: IPageIShoppingMallSellerSubscriptionPlan.ISummary =
    await api.functional.shoppingMall.sellerSubscriptionPlans.index(
      connection,
      {
        body: combinedRequest,
      },
    );
  typia.assert<IPageIShoppingMallSellerSubscriptionPlan.ISummary>(combinedPage);

  const paginationCombined = combinedPage.pagination;
  TestValidator.equals(
    "combined: current page equals requested page",
    paginationCombined.current,
    combinedRequest.page ?? 1,
  );
  TestValidator.equals(
    "combined: limit equals requested limit",
    paginationCombined.limit,
    combinedRequest.limit ?? 20,
  );

  if (combinedPage.data.length > 0) {
    for (const summary of combinedPage.data) {
      TestValidator.predicate(
        "combined: summary.name contains fragment with both filters (case-insensitive)",
        containsFragment(summary.name, trimmedFragment),
      );
    }
  }

  // When all three result sets are non-empty, ensure the combined result is not
  // larger than either individual filter result set.
  if (
    searchOnlyPage.data.length > 0 &&
    nameOnlyPage.data.length > 0 &&
    combinedPage.data.length > 0
  ) {
    TestValidator.predicate(
      "combined result size is not greater than search-only size",
      combinedPage.data.length <= searchOnlyPage.data.length,
    );
    TestValidator.predicate(
      "combined result size is not greater than name-only size",
      combinedPage.data.length <= nameOnlyPage.data.length,
    );
  }
}
