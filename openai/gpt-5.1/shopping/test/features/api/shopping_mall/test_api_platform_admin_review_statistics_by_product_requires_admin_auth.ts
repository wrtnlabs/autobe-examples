import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductReviewStatisticsByProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductReviewStatisticsByProduct";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductReviewStatisticsByProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatisticsByProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Ensure that per-product review statistics endpoint requires platform admin
 * authentication.
 *
 * Business context:
 *
 * - /shoppingMall/platformAdmin/reviews/statistics/byProduct is an internal
 *   analytics endpoint intended for administrative tooling.
 * - The provided SDK only exposes platform admin authentication, so this test
 *   focuses on verifying that unauthenticated access fails and authenticated
 *   platform admin access succeeds.
 *
 * Test steps:
 *
 * 1. Attempt to call PATCH
 *    /shoppingMall/platformAdmin/reviews/statistics/byProduct without
 *    performing any admin join, using an empty but type-correct filter body.
 *    Expect the call to fail due to missing/invalid authorization, asserted via
 *    TestValidator.error.
 * 2. Perform platform admin join via POST /auth/platformAdmin/join using
 *    api.functional.auth.platformAdmin.join with a realistic join request body,
 *    and assert the returned IShoppingMallPlatformAdmin.IAuthorized structure.
 *    The SDK will automatically set connection.headers.Authorization from the
 *    issued access token.
 * 3. With the now-authenticated connection, call
 *    api.functional.shoppingMall.platformAdmin.reviews.statistics.byProduct.index
 *    again using a minimal but explicit
 *    IShoppingMallProductReviewStatisticsByProduct.IRequest body including
 *    pagination and ordering parameters. This call should succeed.
 * 4. Validate core pagination semantics on the response page object (limit echo,
 *    non-negative indices and counts) while relying on typia.assert for full
 *    structural validation.
 */
export async function test_api_platform_admin_review_statistics_by_product_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Unauthorized attempt before platform admin join
  await TestValidator.error(
    "unauthenticated call to byProduct statistics should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.reviews.statistics.byProduct.index(
        connection,
        {
          body: {} satisfies IShoppingMallProductReviewStatisticsByProduct.IRequest,
        },
      );
    },
  );

  // 2. Register a platform admin via /auth/platformAdmin/join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: "203.0.113.10",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 3. Authorized attempt after platform admin join
  const requestBody = {
    limit: 10,
    offset: 0,
    orderBy: "productId" as const,
    orderDirection: "asc" as const,
  } satisfies IShoppingMallProductReviewStatisticsByProduct.IRequest;

  const page =
    await api.functional.shoppingMall.platformAdmin.reviews.statistics.byProduct.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert<IPageIShoppingMallProductReviewStatisticsByProduct>(page);

  // 4. Validate pagination semantics
  const pagination = page.pagination;
  typia.assert<IPage.IPagination>(pagination);

  TestValidator.equals(
    "pagination limit should match requested limit",
    pagination.limit,
    requestBody.limit,
  );

  TestValidator.predicate(
    "pagination current page index should be non-negative",
    pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination records should be non-negative",
    pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages should be non-negative",
    pagination.pages >= 0,
  );
}
