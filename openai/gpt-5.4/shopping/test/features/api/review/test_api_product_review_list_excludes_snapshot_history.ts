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

export async function test_api_product_review_list_excludes_snapshot_history(
  connection: api.IConnection,
): Promise<void> {
  const publicConnection: api.IConnection = {
    host: connection.host,
    headers: connection.headers,
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };
  const productId = typia.random<string & tags.Format<"uuid">>();
  const activeRequest = {
    deleted: false,
    page: 1,
    limit: 100,
    sort: "-updated_at",
  } satisfies IShoppingMallReview.IRequest;
  const unfilteredRequest = {
    page: 1,
    limit: 100,
    sort: "-updated_at",
  } satisfies IShoppingMallReview.IRequest;
  const activePage = await api.functional.shoppingMall.products.reviews.index(
    publicConnection,
    {
      productId,
      body: activeRequest,
    },
  );
  typia.assert(activePage);
  TestValidator.equals(
    "active pagination current page matches request",
    activePage.pagination.current,
    activeRequest.page,
  );
  TestValidator.equals(
    "active pagination limit matches request",
    activePage.pagination.limit,
    activeRequest.limit,
  );
  TestValidator.predicate(
    "active records cover current page size",
    activePage.pagination.records >= activePage.data.length,
  );
  TestValidator.predicate(
    "active pages are non-negative",
    activePage.pagination.pages >= 0,
  );
  for (const review of activePage.data) {
    typia.assert(review);
    TestValidator.equals(
      "active review belongs to requested product",
      review.product.id,
      productId,
    );
    TestValidator.equals(
      "active list excludes deleted reviews",
      review.deleted_at,
      null,
    );
  }
  const unfilteredPage =
    await api.functional.shoppingMall.products.reviews.index(publicConnection, {
      productId,
      body: unfilteredRequest,
    });
  typia.assert(unfilteredPage);
  TestValidator.equals(
    "unfiltered pagination current page matches request",
    unfilteredPage.pagination.current,
    unfilteredRequest.page,
  );
  TestValidator.equals(
    "unfiltered pagination limit matches request",
    unfilteredPage.pagination.limit,
    unfilteredRequest.limit,
  );
  TestValidator.predicate(
    "unfiltered records cover current page size",
    unfilteredPage.pagination.records >= unfilteredPage.data.length,
  );
  for (const review of unfilteredPage.data) {
    typia.assert(review);
    TestValidator.equals(
      "unfiltered review belongs to requested product",
      review.product.id,
      productId,
    );
  }
}
