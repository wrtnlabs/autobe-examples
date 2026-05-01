import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewStatistic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that review statistics endpoint returns 404 for a non-existent product.
 *
 * Validates the product existence check in the review statistics endpoint by authenticating an administrator and querying statistics for a product ID that does not exist in the system. The endpoint must reject the request with a 404 status before attempting any aggregate computation.
 *
 * This test ensures the endpoint properly validates product existence as specified — if the product does not exist or has been soft-deleted, a 404 error must be returned rather than returning zero-valued statistics.
 *
 * 1. Administrator registers and authenticates via authorize_admin_join.
 * 2. A random valid UUID is generated as the non-existent product identifier.
 * 3. The review statistics endpoint is queried with the non-existent product ID.
 * 4. A 404 HttpError is expected, confirming the endpoint validates product existence.
 */
export async function test_api_review_statistics_product_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Generate a valid UUID that does not correspond to any existing product
  const nonExistentProductId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve review statistics for non-existent product — expect 404
  await TestValidator.httpError(
    "product not found returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.admin.products.review_statistics.at(
        adminConnection,
        { productId: nonExistentProductId },
      );
    },
  );
}
