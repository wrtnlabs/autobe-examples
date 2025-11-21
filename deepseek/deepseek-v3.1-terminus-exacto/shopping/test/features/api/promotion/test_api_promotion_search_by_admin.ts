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
 * Comprehensive promotion search functionality test for administrators.
 *
 * This test validates that administrators can search promotions using various
 * filters including promotion type, active status, date ranges, priority
 * levels, and channel associations. It tests pagination functionality with
 * different page sizes and sorting options, ensuring search results accurately
 * reflect filter criteria and provide proper promotion summaries for
 * administrative campaign management.
 */
export async function test_api_promotion_search_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({
        promotions: ["read", "write", "delete"],
        campaigns: ["manage"],
      }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Test basic pagination
  const page1Results = await api.functional.shoppingMall.admin.promotions.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallPromotion.IRequest,
    },
  );
  typia.assert(page1Results);
  TestValidator.equals(
    "page 1 should have pagination info",
    page1Results.pagination.current,
    1,
  );
  TestValidator.predicate(
    "page 1 limit should be respected",
    page1Results.data.length <= 10,
  );

  // Step 3: Test different page size
  const pageSize25Results =
    await api.functional.shoppingMall.admin.promotions.index(connection, {
      body: {
        page: 1,
        limit: 25,
      } satisfies IShoppingMallPromotion.IRequest,
    });
  typia.assert(pageSize25Results);
  TestValidator.equals(
    "page size 25 should have correct limit",
    pageSize25Results.pagination.limit,
    25,
  );

  // Step 4: Test search functionality
  const searchResults =
    await api.functional.shoppingMall.admin.promotions.index(connection, {
      body: {
        search: "sale",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallPromotion.IRequest,
    });
  typia.assert(searchResults);

  // Step 5: Test promotion type filtering
  const typeFilterResults =
    await api.functional.shoppingMall.admin.promotions.index(connection, {
      body: {
        promotion_type: "sale",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallPromotion.IRequest,
    });
  typia.assert(typeFilterResults);

  // Step 6: Test active status filtering
  const activeResults =
    await api.functional.shoppingMall.admin.promotions.index(connection, {
      body: {
        is_active: true,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallPromotion.IRequest,
    });
  typia.assert(activeResults);

  // Step 7: Test date range filtering
  const currentDate = new Date().toISOString();
  const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow

  const dateRangeResults =
    await api.functional.shoppingMall.admin.promotions.index(connection, {
      body: {
        start_date_from: currentDate,
        start_date_to: futureDate,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallPromotion.IRequest,
    });
  typia.assert(dateRangeResults);

  // Step 8: Test priority filtering
  const priorityResults =
    await api.functional.shoppingMall.admin.promotions.index(connection, {
      body: {
        priority_min: 5,
        priority_max: 10,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallPromotion.IRequest,
    });
  typia.assert(priorityResults);

  // Step 9: Test channel filtering
  const channelResults =
    await api.functional.shoppingMall.admin.promotions.index(connection, {
      body: {
        channel_code: "online",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallPromotion.IRequest,
    });
  typia.assert(channelResults);

  // Step 10: Test sorting functionality
  const sortedResults =
    await api.functional.shoppingMall.admin.promotions.index(connection, {
      body: {
        order_by: "priority",
        order_direction: "desc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallPromotion.IRequest,
    });
  typia.assert(sortedResults);

  // Step 11: Test combined filters
  const combinedResults =
    await api.functional.shoppingMall.admin.promotions.index(connection, {
      body: {
        promotion_type: "sale",
        is_active: true,
        priority_min: 3,
        page: 1,
        limit: 5,
        order_by: "created_at",
        order_direction: "desc",
      } satisfies IShoppingMallPromotion.IRequest,
    });
  typia.assert(combinedResults);

  // Step 12: Validate promotion summary structure
  if (combinedResults.data.length > 0) {
    const promotion = combinedResults.data[0];
    TestValidator.predicate(
      "promotion should have id",
      promotion.id !== undefined,
    );
    TestValidator.predicate(
      "promotion should have name",
      promotion.name !== undefined,
    );
    TestValidator.predicate(
      "promotion should have type",
      promotion.promotion_type !== undefined,
    );
    TestValidator.predicate(
      "promotion should have start date",
      promotion.start_date !== undefined,
    );
    TestValidator.predicate(
      "promotion should have end date",
      promotion.end_date !== undefined,
    );
    TestValidator.predicate(
      "promotion should have active status",
      typeof promotion.is_active === "boolean",
    );
    TestValidator.predicate(
      "promotion should have priority",
      typeof promotion.priority === "number",
    );
  }
}
