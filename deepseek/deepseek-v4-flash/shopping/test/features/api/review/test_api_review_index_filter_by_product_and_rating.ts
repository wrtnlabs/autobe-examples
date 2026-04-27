import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_review_index_filter_by_product_and_rating(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: typia.random<IECommerceMallAdministrator.IJoin>(),
  });
  typia.assert(authorized);
  // 2. Fetch first page of reviews to discover a target product
  const firstPage =
    await api.functional.eCommerceMall.administrator.reviews.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IECommerceMallReview.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.predicate(
    "there are reviews in the system",
    firstPage.data.length > 0,
  );
  // Pick the first review's product as our target
  const productId = firstPage.data[0].product.id;
  // 3. Filter by productId only
  const filteredByProduct =
    await api.functional.eCommerceMall.administrator.reviews.index(
      adminConnection,
      {
        body: {
          productId,
          page: 1,
          limit: 100,
        } satisfies IECommerceMallReview.IRequest,
      },
    );
  typia.assert(filteredByProduct);
  for (const review of filteredByProduct.data) {
    TestValidator.equals(
      "review belongs to specified product",
      review.product.id,
      productId,
    );
  }
  // 4. Filter by productId + high rating range (4-5)
  const highRated =
    await api.functional.eCommerceMall.administrator.reviews.index(
      adminConnection,
      {
        body: {
          productId,
          minRating: 4,
          maxRating: 5,
          page: 1,
          limit: 100,
        } satisfies IECommerceMallReview.IRequest,
      },
    );
  typia.assert(highRated);
  for (const review of highRated.data) {
    TestValidator.predicate(
      `rating ${review.rating} is between 4 and 5`,
      review.rating >= 4 && review.rating <= 5,
    );
  }
  TestValidator.predicate(
    "filtered count <= unfiltered product count",
    highRated.pagination.records <= filteredByProduct.pagination.records,
  );
  // 5. Filter by productId + low rating range (1-1)
  const lowRated =
    await api.functional.eCommerceMall.administrator.reviews.index(
      adminConnection,
      {
        body: {
          productId,
          minRating: 1,
          maxRating: 1,
          page: 1,
          limit: 100,
        } satisfies IECommerceMallReview.IRequest,
      },
    );
  typia.assert(lowRated);
  for (const review of lowRated.data) {
    TestValidator.equals("rating is exactly 1", review.rating, 1);
  }
  // 6. Filter with non-existent productId
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  const emptyResult =
    await api.functional.eCommerceMall.administrator.reviews.index(
      adminConnection,
      {
        body: {
          productId: nonExistentId,
          page: 1,
          limit: 100,
        } satisfies IECommerceMallReview.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty data for non-existent product",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "records is 0 for non-existent product",
    emptyResult.pagination.records,
    0,
  );
}
