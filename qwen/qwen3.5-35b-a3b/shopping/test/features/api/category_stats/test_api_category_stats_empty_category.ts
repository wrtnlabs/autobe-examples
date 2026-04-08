import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategoriesStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategoriesStatistic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test category statistics retrieval for an empty category with no products, orders, or reviews.
 *
 * Validates that the category statistics endpoint returns valid statistics with zero counts when
 * querying a category that contains no products, orders, or reviews. This ensures the system
 * handles empty categories gracefully and returns proper default values for all metrics.
 *
 * Special attention is given to verifying that COUNT operations handle zero-product scenarios
 * correctly and that nullable fields like averageRating return null as expected.
 *
 * 1. Administrator registers via /auth/administrator/join
 * 2. Test statistics endpoint for empty category (category must exist in database)
 * 3. Validate all count fields are 0, averageRating is null, lastUpdated is valid date-time
 *
 * **Note**: Category creation endpoint is not available in the current SDK. This test assumes
 * a pre-existing category is present in the test database with no products, orders, or reviews.
 */
export async function test_api_category_stats_empty_category(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        display_name: RandomGenerator.name(),
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        grade: "regular" as const,
      } satisfies IEcommerceMallAdministrator.IJoin,
    });
  typia.assert(admin);
  // 2. Retrieve statistics for empty category
  // Note: Category must exist in database with no products, orders, or reviews
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const stats: IEcommerceMallCategoriesStatistic.IStat =
    await api.functional.ecommerceMall.administrator.categories.stats(
      adminConnection,
      {
        categoryId,
      },
    );
  typia.assert(stats);
  // 3. Validate empty category statistics
  TestValidator.equals(
    "total products count is zero",
    stats.totalProductsCount,
    0,
  );
  TestValidator.equals(
    "active products count is zero",
    stats.activeProductCount,
    0,
  );
  TestValidator.equals("total orders count is zero", stats.totalOrderCount, 0);
  TestValidator.equals(
    "unique customer count is zero",
    stats.uniqueCustomerCount,
    0,
  );
  TestValidator.equals(
    "average rating is null for no reviews",
    stats.averageRating,
    null,
  );
  TestValidator.predicate(
    "lastUpdated is valid date-time string",
    () => !isNaN(Date.parse(stats.lastUpdated)),
  );
}
