import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_reviews_snapshots_no_access_to_unrelated_reviews(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as seller to establish connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // Create a random review_id that doesn't belong to this seller (simulating unrelated review)
  const unrelatedReviewId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Seller attempts to query review snapshots for an unrelated review_id
  const reviewSnapshotRequest: IShoppingMallReviewSnapshot.IRequest = {
    page: 1,
    limit: 10,
    review_id: unrelatedReviewId, // Unrelated review_id - should return empty
  };
  const result =
    await api.functional.shoppingMall.seller.reviews_snapshots.index(
      sellerConnection,
      {
        body: reviewSnapshotRequest,
      },
    );
  typia.assert(result);
  // Validate that seller receives empty result (privacy by design)
  TestValidator.equals(
    "pagination records count",
    result.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages count", result.pagination.pages, 0);
  TestValidator.equals("data array length", result.data.length, 0);
}
