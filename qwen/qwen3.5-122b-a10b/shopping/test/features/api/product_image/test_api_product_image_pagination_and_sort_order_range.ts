import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_image_pagination_and_sort_order_range(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection for product image management
  const sellerConnection: api.IConnection = { host: connection.host };
  // Test 1: Basic Pagination
  const basicPaginationResult =
    await api.functional.ecommerceMall.products.images.index(sellerConnection, {
      productId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IEcommerceMallProductImage.IRequest,
    });
  typia.assert(basicPaginationResult);
  TestValidator.equals(
    "basic pagination current page",
    basicPaginationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "basic pagination limit",
    basicPaginationResult.pagination.limit,
    10,
  );
  // Test 2: Sort Order Range Filtering
  const sortOrderRangeResult =
    await api.functional.ecommerceMall.products.images.index(sellerConnection, {
      productId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        sort_order_min: 2 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
        sort_order_max: 5 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
      } satisfies IEcommerceMallProductImage.IRequest,
    });
  typia.assert(sortOrderRangeResult);
  // Test 3: Combined Filtering (is_primary + sort_order range)
  const combinedFilterResult =
    await api.functional.ecommerceMall.products.images.index(sellerConnection, {
      productId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        is_primary: true,
        sort_order_min: 0 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
        sort_order_max: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
      } satisfies IEcommerceMallProductImage.IRequest,
    });
  typia.assert(combinedFilterResult);
  // Test 4: Pagination Across Multiple Pages
  const productId = typia.random<string & tags.Format<"uuid">>();
  const page1Result = await api.functional.ecommerceMall.products.images.index(
    sellerConnection,
    {
      productId,
      body: {
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 5 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IEcommerceMallProductImage.IRequest,
    },
  );
  typia.assert(page1Result);
  TestValidator.equals("page 1 current", page1Result.pagination.current, 1);
  const page2Result = await api.functional.ecommerceMall.products.images.index(
    sellerConnection,
    {
      productId,
      body: {
        page: 2 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 5 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IEcommerceMallProductImage.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  // Test 5: Empty Result Set
  const emptyResult = await api.functional.ecommerceMall.products.images.index(
    sellerConnection,
    {
      productId,
      body: {
        sort_order_min: 100 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
        sort_order_max: 200 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
      } satisfies IEcommerceMallProductImage.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals("empty result pages", emptyResult.pagination.pages, 0);
  TestValidator.equals("empty result data length", emptyResult.data.length, 0);
  // Test 6: Boundary Values
  const boundaryResult =
    await api.functional.ecommerceMall.products.images.index(sellerConnection, {
      productId,
      body: {
        sort_order_min: 0 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
        sort_order_max: 100 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
      } satisfies IEcommerceMallProductImage.IRequest,
    });
  typia.assert(boundaryResult);
}
