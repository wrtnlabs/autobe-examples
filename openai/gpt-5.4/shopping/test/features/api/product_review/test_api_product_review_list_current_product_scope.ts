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

export async function test_api_product_review_list_current_product_scope(
  connection: api.IConnection,
): Promise<void> {
  const viewerConnection: api.IConnection = {
    host: connection.host,
    headers: connection.headers,
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };
  const productId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    page: 1,
    limit: 10,
    deleted: false,
    sort: "-created_at",
  } satisfies IShoppingMallReview.IRequest;
  const page = await api.functional.shoppingMall.products.reviews.index(
    viewerConnection,
    {
      productId,
      body,
    },
  );
  typia.assert<IPageIShoppingMallReview.ISummary>(page);
  TestValidator.equals(
    "pagination current matches request",
    page.pagination.current,
    body.page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    page.pagination.limit,
    body.limit,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page data length does not exceed limit",
    page.data.length <= page.pagination.limit,
  );
  for (const review of page.data) {
    typia.assert<IShoppingMallReview.ISummary>(review);
    TestValidator.equals(
      "review belongs to requested product",
      review.product.id,
      productId,
    );
    TestValidator.equals(
      "active review has null deleted_at",
      review.deleted_at,
      null,
    );
    TestValidator.predicate(
      "rating is within review score range",
      review.rating >= 1 && review.rating <= 5,
    );
    if (review.content !== null) {
      TestValidator.predicate(
        "review content is not empty when present",
        review.content.length > 0,
      );
    }
  }
  const repeated = await api.functional.shoppingMall.products.reviews.index(
    viewerConnection,
    {
      productId,
      body,
    },
  );
  typia.assert<IPageIShoppingMallReview.ISummary>(repeated);
  TestValidator.equals(
    "repeated pagination current matches first read",
    repeated.pagination.current,
    page.pagination.current,
  );
  TestValidator.equals(
    "repeated pagination limit matches first read",
    repeated.pagination.limit,
    page.pagination.limit,
  );
  TestValidator.equals(
    "repeated pagination records matches first read",
    repeated.pagination.records,
    page.pagination.records,
  );
  TestValidator.equals(
    "repeated pagination pages matches first read",
    repeated.pagination.pages,
    page.pagination.pages,
  );
  TestValidator.predicate(
    "repeated page data length does not exceed limit",
    repeated.data.length <= repeated.pagination.limit,
  );
  TestValidator.equals(
    "repeated ordered review ids match first read",
    repeated.data.map((review) => review.id),
    page.data.map((review) => review.id),
  );
  for (const review of repeated.data) {
    TestValidator.equals(
      "repeated review still belongs to requested product",
      review.product.id,
      productId,
    );
  }
}
