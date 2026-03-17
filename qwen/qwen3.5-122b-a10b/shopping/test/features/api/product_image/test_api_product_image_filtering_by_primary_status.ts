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

export async function test_api_product_image_filtering_by_primary_status(
  connection: api.IConnection,
): Promise<void> {
  // Generate a product ID for testing
  const productId = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string & tags.Format<"uuid">;
  // Test 1: Filter by primary images only (is_primary=true)
  const primaryFilterResult: IPageIEcommerceMallProductImage.ISummary =
    await api.functional.ecommerceMall.products.images.index(connection, {
      productId,
      body: {
        is_primary: true,
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallProductImage.IRequest,
    });
  typia.assert(primaryFilterResult);
  // Validate that all returned images are primary
  for (const image of primaryFilterResult.data) {
    TestValidator.predicate(
      "all images are primary",
      image.is_primary === true,
    );
  }
  // Validate pagination metadata for primary filter
  TestValidator.equals(
    "primary filter records count",
    primaryFilterResult.pagination.records,
    primaryFilterResult.data.length,
  );
  // Test 2: Filter by non-primary images (is_primary=false)
  const nonPrimaryFilterResult: IPageIEcommerceMallProductImage.ISummary =
    await api.functional.ecommerceMall.products.images.index(connection, {
      productId,
      body: {
        is_primary: false,
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallProductImage.IRequest,
    });
  typia.assert(nonPrimaryFilterResult);
  // Validate that all returned images are non-primary
  for (const image of nonPrimaryFilterResult.data) {
    TestValidator.predicate(
      "all images are non-primary",
      image.is_primary === false,
    );
  }
  // Validate pagination metadata for non-primary filter
  TestValidator.equals(
    "non-primary filter records count",
    nonPrimaryFilterResult.pagination.records,
    nonPrimaryFilterResult.data.length,
  );
  // Test 3: No filter - get all images (is_primary=null)
  const allImagesResult: IPageIEcommerceMallProductImage.ISummary =
    await api.functional.ecommerceMall.products.images.index(connection, {
      productId,
      body: {
        is_primary: null,
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallProductImage.IRequest,
    });
  typia.assert(allImagesResult);
  // Validate that all images are returned (both primary and non-primary)
  TestValidator.equals(
    "all images records count",
    allImagesResult.pagination.records,
    allImagesResult.data.length,
  );
  // Test 4: Verify sort order preservation
  // When images are returned, they should be sorted by sort_order ascending
  if (allImagesResult.data.length > 1) {
    for (let i = 1; i < allImagesResult.data.length; i++) {
      TestValidator.predicate(
        `sort order preserved at index ${i}`,
        allImagesResult.data[i - 1].sort_order <=
          allImagesResult.data[i].sort_order,
      );
    }
  }
  // Test 5: Verify sort order preservation in primary filter
  if (primaryFilterResult.data.length > 1) {
    for (let i = 1; i < primaryFilterResult.data.length; i++) {
      TestValidator.predicate(
        `primary sort order preserved at index ${i}`,
        primaryFilterResult.data[i - 1].sort_order <=
          primaryFilterResult.data[i].sort_order,
      );
    }
  }
  // Test 6: Test pagination with filtering
  const paginatedResult: IPageIEcommerceMallProductImage.ISummary =
    await api.functional.ecommerceMall.products.images.index(connection, {
      productId,
      body: {
        is_primary: null,
        page: 1,
        limit: 5,
      } satisfies IEcommerceMallProductImage.IRequest,
    });
  typia.assert(paginatedResult);
  // Validate pagination metadata
  TestValidator.equals("current page", paginatedResult.pagination.current, 1);
  TestValidator.equals("limit", paginatedResult.pagination.limit, 5);
  TestValidator.predicate(
    "records non-negative",
    paginatedResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages non-negative",
    paginatedResult.pagination.pages >= 0,
  );
  // Test 7: Edge case - empty results with is_primary=false
  // When filtering for non-primary images and only primary exists, should return empty
  const emptyResult: IPageIEcommerceMallProductImage.ISummary =
    await api.functional.ecommerceMall.products.images.index(connection, {
      productId,
      body: {
        is_primary: false,
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallProductImage.IRequest,
    });
  typia.assert(emptyResult);
  // Validate empty result pagination
  TestValidator.predicate(
    "empty result has zero records",
    emptyResult.pagination.records === 0,
  );
  TestValidator.predicate(
    "empty result has zero pages",
    emptyResult.pagination.pages === 0,
  );
  TestValidator.equals(
    "empty result data array length",
    emptyResult.data.length,
    0,
  );
}
