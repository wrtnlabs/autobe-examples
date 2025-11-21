import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_tenant_isolation(
  connection: api.IConnection,
) {
  // Create two different tenants with unique identifiers
  const tenant1Id = typia.random<string & tags.Format<"uuid">>();
  const tenant2Id = typia.random<string & tags.Format<"uuid">>();

  // Create sample reviews for tenant1 using their tenant identifier
  const tenant1ReviewData: IShoppingMallReview.IRequest = tenant1Id;
  const tenant1Reviews: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: tenant1ReviewData,
    });
  typia.assert(tenant1Reviews);

  // Create sample reviews for tenant2 using their tenant identifier
  const tenant2ReviewData: IShoppingMallReview.IRequest = tenant2Id;
  const tenant2Reviews: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: tenant2ReviewData,
    });
  typia.assert(tenant2Reviews);

  // Test tenant1 cannot access reviews from tenant2
  await TestValidator.error(
    "tenant1 should not access reviews from tenant2",
    async () => {
      await api.functional.shoppingMall.reviews.index(connection, {
        body: tenant2Id,
      });
    },
  );

  // Test tenant2 cannot access reviews from tenant1
  await TestValidator.error(
    "tenant2 should not access reviews from tenant1",
    async () => {
      await api.functional.shoppingMall.reviews.index(connection, {
        body: tenant1Id,
      });
    },
  );
}
