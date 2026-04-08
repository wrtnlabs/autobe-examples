import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_reviews_retrieve_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller using utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Retrieve paginated reviews list
  const reviewsResponse =
    await api.functional.ecommerceMall.seller.reviews.list(sellerConnection);
  typia.assert(reviewsResponse);
  // 3. Validate pagination metadata structure
  const pagination = reviewsResponse.pagination;
  TestValidator.equals(
    "pagination current page",
    pagination.current >= 1,
    true,
  );
  TestValidator.equals("pagination limit", pagination.limit, 20);
  TestValidator.equals(
    "pagination records >= 0",
    pagination.records >= 0,
    true,
  );
  TestValidator.equals("pagination pages >= 0", pagination.pages >= 0, true);
  // 4. Validate pagination calculation
  if (pagination.records > 0) {
    const expectedPages = Math.ceil(pagination.records / pagination.limit);
    TestValidator.equals("pages calculation", pagination.pages, expectedPages);
  }
  // 5. Validate data array exists and is array
  TestValidator.predicate("data is array", Array.isArray(reviewsResponse.data));
  // 6. Validate sort order (newest first - descending by createdAt)
  if (reviewsResponse.data.length > 1) {
    for (let i = 0; i < reviewsResponse.data.length - 1; i++) {
      const current = new Date(reviewsResponse.data[i].createdAt).getTime();
      const next = new Date(reviewsResponse.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        `review ${i} is newer than review ${i + 1}`,
        current >= next,
      );
    }
  }
  // 7. Validate review summary structure if data exists
  if (reviewsResponse.data.length > 0) {
    const firstReview = reviewsResponse.data[0];
    TestValidator.predicate(
      "review has newRating",
      firstReview.newRating >= 1 && firstReview.newRating <= 5,
    );
    TestValidator.predicate(
      "review has reviewId",
      firstReview.reviewId !== undefined,
    );
    TestValidator.predicate(
      "review has createdAt",
      firstReview.createdAt !== undefined,
    );
  }
}
