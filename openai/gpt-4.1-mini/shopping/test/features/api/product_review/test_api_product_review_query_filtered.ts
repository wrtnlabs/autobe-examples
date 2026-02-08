import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductReview";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
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

export async function test_api_product_review_query_filtered(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful query of product reviews with typical filters.
  // 1. Authenticate as seller by joining
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(sellerAuthorized);
  sellerConnection.headers = {
    Authorization: sellerAuthorized.token.access,
  };
  // 2. Create a new product by authenticated seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(product);
  const productId = (
    product as {
      id: string;
    }
  ).id;
  // 3. Use created product ID to perform filtered review query
  const now = new Date();
  const createdFrom = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 30,
  );
  const createdTo = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Define filtered request for scenario 1
  const filteredRequest1 = {
    ratingMin: 2,
    ratingMax: 4,
    textSearch:
      RandomGenerator.substring(RandomGenerator.paragraph({ sentences: 5 })) ||
      null,
    createdDateFrom: createdFrom.toISOString(),
    createdDateTo: createdTo.toISOString(),
    reviewerDisplayName: RandomGenerator.name(2),
  } satisfies Partial<
    Omit<
      IShoppingMallProductReview.IRequest,
      "page" | "limit" | "order" | "direction"
    >
  >;
  const queryResponse1 =
    await api.functional.shoppingMall.products.reviews.query.index(
      sellerConnection,
      {
        productId: productId,
        body: filteredRequest1,
      },
    );
  typia.assert(queryResponse1);
  for (const review of queryResponse1.data) {
    // ISummary does not have these properties available, so we only assert type
    typia.assert(review);
  }
  TestValidator.predicate(
    "pagination current page positive",
    queryResponse1.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    queryResponse1.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination pages positive",
    queryResponse1.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    queryResponse1.pagination.records >= 0,
  );
  // Scenario 2: Query product reviews filtering by edge rating values and creation date range.
  const product2 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(product2);
  const productId2 = (
    product2 as {
      id: string;
    }
  ).id;
  const yearStart = new Date(2024, 0, 1).toISOString();
  const yearEnd = new Date(2024, 11, 31, 23, 59, 59, 999).toISOString();
  const filteredRequest2 = {
    ratingMin: 1,
    ratingMax: 5,
    createdDateFrom: yearStart,
    createdDateTo: yearEnd,
  } satisfies Partial<
    Omit<
      IShoppingMallProductReview.IRequest,
      "page" | "limit" | "order" | "direction"
    >
  >;
  const queryResponse2 =
    await api.functional.shoppingMall.products.reviews.query.index(
      sellerConnection,
      {
        productId: productId2,
        body: filteredRequest2,
      },
    );
  typia.assert(queryResponse2);
  for (const review of queryResponse2.data) {
    typia.assert(review);
  }
}
