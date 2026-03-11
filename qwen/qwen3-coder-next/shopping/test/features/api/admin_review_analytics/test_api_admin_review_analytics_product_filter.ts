import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin review analytics filtering by product.
 * 1. Register admin account
 * 2. Call analytics endpoint with review filtering parameters
 * 3. Validate response structure and pagination
 */
export async function test_api_admin_review_analytics_product_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Call analytics endpoint with valid request body
  // The endpoint requires rating field in the request body for filtering
  const reviewsResponse =
    await api.functional.ecommerceMall.admin.analytics.reviews.index(
      adminConnection,
      {
        body: {
          rating: 4,
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(reviewsResponse);
  // 3. Validate response structure
  TestValidator.predicate(
    "reviews response has correct structure",
    reviewsResponse.data && Array.isArray(reviewsResponse.data),
  );
  // 4. Verify pagination metadata exists
  TestValidator.predicate(
    "pagination metadata exists",
    reviewsResponse.pagination !== undefined,
  );
  // 5. Confirm pagination consistency
  TestValidator.equals(
    "pagination records matches data length",
    reviewsResponse.pagination.records,
    reviewsResponse.data.length,
  );
}
