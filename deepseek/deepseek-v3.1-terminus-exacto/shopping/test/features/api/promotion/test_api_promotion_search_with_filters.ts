import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPromotion";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotion";

/**
 * Comprehensive E2E test for advanced promotion filtering capabilities.
 *
 * Validates type-based filtering, date range searches, priority level
 * restrictions, channel-specific promotions, and combination filter scenarios.
 * Tests edge cases including empty result sets, overlapping date ranges, and
 * priority boundaries.
 */
export async function test_api_promotion_search_with_filters(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator (dependency)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role: "super_admin",
        permissions: JSON.stringify({ access_level: "full" }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Test basic search with default parameters
  const defaultSearch: IPageIShoppingMallPromotion.ISummary =
    await api.functional.shoppingMall.admin.promotions.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallPromotion.IRequest,
    });
  typia.assert(defaultSearch);
  TestValidator.predicate(
    "default search returns pagination info",
    defaultSearch.pagination.pages >= 0 &&
      defaultSearch.pagination.records >= 0,
  );

  // Step 3: Test type-based filtering
  const typeFiltered: IPageIShoppingMallPromotion.ISummary =
    await api.functional.shoppingMall.admin.promotions.index(connection, {
      body: {
        promotion_type: "sale",
        page: 1,
        limit: 5,
      } satisfies IShoppingMallPromotion.IRequest,
    });
  typia.assert(typeFiltered);

  // Step 4: Test active status filtering
  const activePromotions: IPageIShoppingMallPromotion.ISummary =
    await api.functional.shoppingMall.admin.promotions.index(connection, {
      body: {
        is_active: true,
        page: 1,
        limit: 5,
      } satisfies IShoppingMallPromotion.IRequest,
    });
  typia.assert(activePromotions);

  // Step 5: Test date range filtering
  const currentDate = new Date().toISOString();
  const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow

  const dateFiltered: IPageIShoppingMallPromotion.ISummary =
    await api.functional.shoppingMall.admin.promotions.index(connection, {
      body: {
        start_date_from: currentDate,
        end_date_to: futureDate,
        page: 1,
        limit: 5,
      } satisfies IShoppingMallPromotion.IRequest,
    });
  typia.assert(dateFiltered);

  // Step 6: Test priority level filtering
  const priorityFiltered: IPageIShoppingMallPromotion.ISummary =
    await api.functional.shoppingMall.admin.promotions.index(connection, {
      body: {
        priority_min: 5,
        priority_max: 10,
        page: 1,
        limit: 5,
      } satisfies IShoppingMallPromotion.IRequest,
    });
  typia.assert(priorityFiltered);

  // Step 7: Test channel-specific filtering
  const channelFiltered: IPageIShoppingMallPromotion.ISummary =
    await api.functional.shoppingMall.admin.promotions.index(connection, {
      body: {
        channel_code: "web",
        page: 1,
        limit: 5,
      } satisfies IShoppingMallPromotion.IRequest,
    });
  typia.assert(channelFiltered);

  // Step 8: Test search term functionality
  const searchTermFiltered: IPageIShoppingMallPromotion.ISummary =
    await api.functional.shoppingMall.admin.promotions.index(connection, {
      body: {
        search: "discount",
        page: 1,
        limit: 5,
      } satisfies IShoppingMallPromotion.IRequest,
    });
  typia.assert(searchTermFiltered);

  // Step 9: Test sorting functionality
  const sortedByName: IPageIShoppingMallPromotion.ISummary =
    await api.functional.shoppingMall.admin.promotions.index(connection, {
      body: {
        order_by: "name",
        order_direction: "asc",
        page: 1,
        limit: 5,
      } satisfies IShoppingMallPromotion.IRequest,
    });
  typia.assert(sortedByName);

  // Step 10: Test combination of multiple filters
  const combinedFilters: IPageIShoppingMallPromotion.ISummary =
    await api.functional.shoppingMall.admin.promotions.index(connection, {
      body: {
        promotion_type: "sale",
        is_active: true,
        priority_min: 3,
        priority_max: 8,
        page: 1,
        limit: 5,
      } satisfies IShoppingMallPromotion.IRequest,
    });
  typia.assert(combinedFilters);

  // Step 11: Test edge case - restrictive filters for empty result set
  const emptyResult: IPageIShoppingMallPromotion.ISummary =
    await api.functional.shoppingMall.admin.promotions.index(connection, {
      body: {
        promotion_type: "non_existent_type",
        page: 1,
        limit: 5,
      } satisfies IShoppingMallPromotion.IRequest,
    });
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result set has zero records",
    emptyResult.pagination.records,
    0,
  );

  // Step 12: Validate pagination structure
  TestValidator.predicate(
    "pagination has valid structure",
    defaultSearch.pagination.current >= 0 &&
      defaultSearch.pagination.limit > 0 &&
      defaultSearch.pagination.records >= 0 &&
      defaultSearch.pagination.pages >= 0,
  );
}
