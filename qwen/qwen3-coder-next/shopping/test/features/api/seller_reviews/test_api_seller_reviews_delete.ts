import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_seller_reviews_delete(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  sellerConnection.headers = {
    ...sellerConnection.headers,
    Authorization: sellerAuthorized.token.access,
  };
  // 2. Create product for seller
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: typia.random<IShoppingMallProduct.ICreate>(),
    },
  );
  typia.assert(product);
  // 3. Create a review for the product
  const reviewRequest: IShoppingMallReview.IManageRequest = {
    action: "write",
    product_id: (product as any).id,
    content: RandomGenerator.paragraph({ sentences: 3 }),
    rating: 5,
  };
  const writeResponse =
    await api.functional.shoppingMall.seller.seller.reviews.manageReviews(
      sellerConnection,
      { body: reviewRequest },
    );
  typia.assert(writeResponse);
  // 4. Verify review was created
  TestValidator.equals("review count is 1", writeResponse.data.length, 1);
  const hasValidReview = writeResponse.data.length > 0 && (writeResponse.data[0] as any).id !== undefined;
  TestValidator.predicate("has valid review", hasValidReview);
  // 5. Get the created review ID
  const reviewId = (writeResponse.data[0] as any).id;
  // 6. Delete the review
  const deleteRequest: IShoppingMallReview.IManageRequest = {
    action: "delete",
    review_id: reviewId,
  };
  const deleteResponse =
    await api.functional.shoppingMall.seller.seller.reviews.manageReviews(
      sellerConnection,
      { body: deleteRequest },
    );
  typia.assert(deleteResponse);
  // 7. Verify review was deleted
  TestValidator.equals(
    "review count after delete is 0",
    deleteResponse.data.length,
    0,
  );
}
