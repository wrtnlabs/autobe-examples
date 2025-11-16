import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerPerformanceSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerPerformanceSummary";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPerformanceSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPerformanceSummary";

export async function test_api_seller_performance_summaries_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Prepare minimal-but-valid search request body
  const requestBody = {
    // All filters omitted so backend uses its own defaults; this still satisfies
    // IShoppingMallSellerPerformanceSummary.IRequest because every field is
    // optional.
  } satisfies IShoppingMallSellerPerformanceSummary.IRequest;

  // 2. Build an unauthenticated connection by cloning the base connection
  //    and dropping all headers so that no Authorization token is present.
  //    Note: we only construct this once and never mutate it afterwards.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Call the seller performance summaries search endpoint with the
  //    unauthenticated connection and assert that it fails.
  await TestValidator.error(
    "seller performance summaries search requires authentication",
    async () => {
      await api.functional.shoppingMall.platformAdmin.sellerPerformanceSummaries.index(
        unauthenticatedConnection,
        {
          body: requestBody,
        },
      );
    },
  );
}
