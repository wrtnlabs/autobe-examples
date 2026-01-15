import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantAttributeSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantAttributeSummary";
import type { IShoppingMallProductVariantIRequestIAttributes } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantIRequestIAttributes";
export async function test_api_product_variant_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Generate 150 product variants to ensure multiple pages (limit=25)
  const variants = await ArrayUtil.asyncRepeat(150, async (index) => {
    return {
      sku: `SKU-${RandomGenerator.alphaNumeric(8)}`,
      name: RandomGenerator.paragraph({ sentences: 2 }),
      price: typia.random<number & tags.Minimum<0>>(),
      availability_status: RandomGenerator.pick([
        "available",
        "low_stock",
        "out_of_stock",
      ] as const),
      variation_attributes: ArrayUtil.repeat(
        typia.random<number & tags.Type<"uint32"> & tags.Maximum<3>>(),
        () => {
          return RandomGenerator.name();
        },
      ),
      images: ArrayUtil.repeat(
        typia.random<number & tags.Type<"uint32"> & tags.Maximum<2>>(),
        () => {
          return {
            id: typia.random<string & tags.Format<"uuid">>(),
            url: typia.random<string & tags.Format<"uri">>(),
            name: RandomGenerator.name(),
            extension: RandomGenerator.pick(["jpg", "png", "jpeg"] as const),
            order: index + 1,
            is_primary: index === 0,
          };
        },
      ),
      is_primary: index === 0,
      inventory_level: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0>
      >(),
    };
  });
  // Create initial request with limit=25, page=1
  const firstPage: IPageIShoppingMallProductVariant.ISummary =
    await api.functional.shoppingMall.product_variants.index(connection, {
      body: {
        limit: 25,
        page: 1,
      } satisfies IShoppingMallProductVariant.IRequest,
    });
  typia.assert(firstPage);
  // Verify first page has exactly 25 items
  TestValidator.equals("first page has 25 items", firstPage.data.length, 25);
  TestValidator.equals(
    "first page pagination",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("first page pagination", firstPage.pagination.limit, 25);
  TestValidator.predicate(
    "total records >= 150",
    () => firstPage.pagination.records >= 150,
  );
  // Collect all variant IDs across pages to detect duplicates
  const allVariantIds = new Set<string>();
  for (const variant of firstPage.data) {
    allVariantIds.add(variant.id);
  }
  // Fetch subsequent pages until all items are retrieved
  let currentPage = 1;
  let hasNextPage = true;
  let finalPage: IPageIShoppingMallProductVariant.ISummary | null = null;
  while (hasNextPage) {
    currentPage++;
    finalPage = await api.functional.shoppingMall.product_variants.index(
      connection,
      {
        body: {
          limit: 25,
          page: currentPage,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
    typia.assert(finalPage);
    // Verify pagination metadata consistency
    TestValidator.equals(
      "pagination limit consistent",
      finalPage!.pagination.limit,
      25,
    );
    TestValidator.equals(
      "pagination records consistent",
      finalPage!.pagination.records,
      firstPage.pagination.records,
    );
    TestValidator.equals(
      "correct current page",
      finalPage!.pagination.current,
      currentPage,
    );
    // Verify we receive items on each subsequent page
    TestValidator.predicate("page has items", () => finalPage!.data.length > 0);
    // Check for duplicates across pages
    for (const variant of finalPage!.data) {
      TestValidator.predicate(
        "no duplicate variant ID",
        () => !allVariantIds.has(variant.id),
      );
      allVariantIds.add(variant.id);
    }
    // Break condition
    if (finalPage!.data.length < 25) {
      hasNextPage = false;
    }
  }
  // Validate final page results
  if (finalPage) {
    // Verify total unique variants match expected count
    TestValidator.equals(
      "total distinct variant count",
      allVariantIds.size,
      150,
    );
    TestValidator.equals("total records", finalPage.pagination.records, 150);
    // Verify total pages calculation
    TestValidator.equals(
      "total pages calculation",
      finalPage.pagination.pages,
      Math.ceil(150 / 25),
    );
  }
}