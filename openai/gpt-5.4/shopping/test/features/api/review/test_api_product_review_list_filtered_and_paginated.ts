import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_review_list_filtered_and_paginated(
  connection: api.IConnection,
): Promise<void> {
  const anonymousConnection: api.IConnection = {
    host: connection.host,
    headers: connection.headers,
    simulate: true,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };
  const productId = typia.random<string & tags.Format<"uuid">>();
  const search = RandomGenerator.alphabets(3).toLowerCase();
  const firstBody = {
    rating: 5,
    search,
    deleted: false,
    page: 1,
    limit: 10,
    sort: "-created_at",
  } satisfies IShoppingMallReview.IRequest;
  const secondBody = {
    rating: 5,
    search,
    deleted: false,
    page: 2,
    limit: 10,
    sort: "-created_at",
  } satisfies IShoppingMallReview.IRequest;
  const ratingSortedBody = {
    rating: 5,
    deleted: false,
    page: 1,
    limit: 10,
    sort: "-rating",
  } satisfies IShoppingMallReview.IRequest;
  const firstPage = await api.functional.shoppingMall.products.reviews.index(
    anonymousConnection,
    {
      productId,
      body: firstBody,
    },
  );
  typia.assert(firstPage);
  const secondPage = await api.functional.shoppingMall.products.reviews.index(
    anonymousConnection,
    {
      productId,
      body: secondBody,
    },
  );
  typia.assert(secondPage);
  const ratingSortedPage =
    await api.functional.shoppingMall.products.reviews.index(
      anonymousConnection,
      {
        productId,
        body: ratingSortedBody,
      },
    );
  typia.assert(ratingSortedPage);
  TestValidator.equals(
    "first page current matches request",
    firstPage.pagination.current,
    firstBody.page,
  );
  TestValidator.equals(
    "first page limit matches request",
    firstPage.pagination.limit,
    firstBody.limit,
  );
  TestValidator.equals(
    "second page current matches request",
    secondPage.pagination.current,
    secondBody.page,
  );
  TestValidator.equals(
    "second page limit matches request",
    secondPage.pagination.limit,
    secondBody.limit,
  );
  TestValidator.equals(
    "rating page current matches request",
    ratingSortedPage.pagination.current,
    ratingSortedBody.page,
  );
  TestValidator.equals(
    "rating page limit matches request",
    ratingSortedPage.pagination.limit,
    ratingSortedBody.limit,
  );
  TestValidator.equals(
    "first page count stays within limit",
    firstPage.data.length <= firstBody.limit,
    true,
  );
  TestValidator.equals(
    "second page count stays within limit",
    secondPage.data.length <= secondBody.limit,
    true,
  );
  TestValidator.equals(
    "rating page count stays within limit",
    ratingSortedPage.data.length <= ratingSortedBody.limit,
    true,
  );
  TestValidator.equals(
    "first page pagination formula",
    firstPage.pagination.pages,
    Math.ceil(firstPage.pagination.records / firstPage.pagination.limit),
  );
  TestValidator.equals(
    "second page pagination formula",
    secondPage.pagination.pages,
    Math.ceil(secondPage.pagination.records / secondPage.pagination.limit),
  );
  TestValidator.equals(
    "rating page pagination formula",
    ratingSortedPage.pagination.pages,
    Math.ceil(
      ratingSortedPage.pagination.records / ratingSortedPage.pagination.limit,
    ),
  );
  TestValidator.equals(
    "first and second page total records stay consistent",
    firstPage.pagination.records,
    secondPage.pagination.records,
  );
  TestValidator.equals(
    "first and second page total pages stay consistent",
    firstPage.pagination.pages,
    secondPage.pagination.pages,
  );
  for (const review of firstPage.data) {
    TestValidator.equals(
      "first page review belongs to requested product",
      review.product.id,
      productId,
    );
    TestValidator.equals(
      "first page rating filter applied",
      review.rating,
      firstBody.rating,
    );
    TestValidator.equals(
      "first page deleted false excludes deleted reviews",
      review.deleted_at,
      null,
    );
    TestValidator.predicate(
      "first page search filter applied when content exists",
      review.content === null ||
        review.content.toLowerCase().includes(search.toLowerCase()),
    );
  }
  for (const review of secondPage.data) {
    TestValidator.equals(
      "second page review belongs to requested product",
      review.product.id,
      productId,
    );
    TestValidator.equals(
      "second page rating filter applied",
      review.rating,
      secondBody.rating,
    );
    TestValidator.equals(
      "second page deleted false excludes deleted reviews",
      review.deleted_at,
      null,
    );
    TestValidator.predicate(
      "second page search filter applied when content exists",
      review.content === null ||
        review.content.toLowerCase().includes(search.toLowerCase()),
    );
  }
  for (const review of ratingSortedPage.data) {
    TestValidator.equals(
      "rating sorted review belongs to requested product",
      review.product.id,
      productId,
    );
    TestValidator.equals(
      "rating sorted page rating filter applied",
      review.rating,
      ratingSortedBody.rating,
    );
    TestValidator.equals(
      "rating sorted page deleted false excludes deleted reviews",
      review.deleted_at,
      null,
    );
  }
  for (let i = 1; i < firstPage.data.length; ++i) {
    TestValidator.predicate(
      "first page is sorted by newest created_at first",
      new Date(firstPage.data[i - 1].created_at).getTime() >=
        new Date(firstPage.data[i].created_at).getTime(),
    );
  }
  for (let i = 1; i < secondPage.data.length; ++i) {
    TestValidator.predicate(
      "second page is sorted by newest created_at first",
      new Date(secondPage.data[i - 1].created_at).getTime() >=
        new Date(secondPage.data[i].created_at).getTime(),
    );
  }
  for (let i = 1; i < ratingSortedPage.data.length; ++i) {
    TestValidator.predicate(
      "rating sorted page is sorted by rating descending",
      ratingSortedPage.data[i - 1].rating >= ratingSortedPage.data[i].rating,
    );
  }
  const firstIds = new Set(firstPage.data.map((review) => review.id));
  for (const review of secondPage.data) {
    TestValidator.equals(
      "later page does not duplicate previous page reviews",
      firstIds.has(review.id),
      false,
    );
  }
}
