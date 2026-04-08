import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_inventory_low_stock_with_category_and_product_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Query low-stock inventory without filters (baseline)
  const baselineResult =
    await api.functional.ecommerceMall.seller.inventories.low_stock.index(
      sellerConnection,
      {
        body: {
          lowStockThreshold: 10,
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(baselineResult);
  // 3. Query with categoryId filter (if we have variants with categories)
  // We need to extract a category ID from baseline results if available
  const categoryIdsInBaseline = baselineResult.data
    .map((v) => v.product?.category?.id)
    .filter((id): id is string => id !== undefined && id !== null);
  if (categoryIdsInBaseline.length > 0) {
    const targetCategoryId = categoryIdsInBaseline[0];
    const filteredByCategory =
      await api.functional.ecommerceMall.seller.inventories.low_stock.index(
        sellerConnection,
        {
          body: {
            lowStockThreshold: 10,
            categoryId: targetCategoryId,
            page: 1,
            limit: 100,
          } satisfies IEcommerceMallProductVariant.IRequest,
        },
      );
    typia.assert(filteredByCategory);
    // Verify all returned variants belong to the filtered category
    for (const variant of filteredByCategory.data) {
      TestValidator.equals(
        "variant category matches filter",
        variant.product?.category?.id,
        targetCategoryId,
      );
    }
    // 4. Query with productName partial match filter
    const productNamesInBaseline = baselineResult.data
      .map((v) => v.product?.name)
      .filter((name): name is string => name !== undefined && name !== null);
    if (productNamesInBaseline.length > 0) {
      // Extract partial name for matching (take first 3-5 characters)
      const targetProductName = productNamesInBaseline[0];
      const partialName = targetProductName.substring(
        0,
        Math.min(4, targetProductName.length),
      );
      const filteredByProductName =
        await api.functional.ecommerceMall.seller.inventories.low_stock.index(
          sellerConnection,
          {
            body: {
              lowStockThreshold: 10,
              productName: partialName,
              page: 1,
              limit: 100,
            } satisfies IEcommerceMallProductVariant.IRequest,
          },
        );
      typia.assert(filteredByProductName);
      // Verify at least some variants match the product name partial match
      // (Some may be filtered out if they don't match)
      TestValidator.predicate(
        "product name filtered results exist or empty is valid",
        filteredByProductName.data.length <= filteredByCategory.data.length ||
          filteredByProductName.data.some((v) =>
            v.product?.name?.toLowerCase().includes(partialName.toLowerCase()),
          ),
      );
      // 5. Query with both categoryId and productName combined
      const combinedFilter =
        await api.functional.ecommerceMall.seller.inventories.low_stock.index(
          sellerConnection,
          {
            body: {
              lowStockThreshold: 10,
              categoryId: targetCategoryId,
              productName: partialName,
              page: 1,
              limit: 100,
            } satisfies IEcommerceMallProductVariant.IRequest,
          },
        );
      typia.assert(combinedFilter);
      // Combined filter should return subset of category-filtered results
      TestValidator.predicate(
        "combined filter results <= category filtered results",
        combinedFilter.data.length <= filteredByCategory.data.length,
      );
      // All combined results must match both filters
      for (const variant of combinedFilter.data) {
        TestValidator.equals(
          "combined filter: category matches",
          variant.product?.category?.id,
          targetCategoryId,
        );
        TestValidator.predicate(
          "combined filter: product name matches partial",
          variant.product?.name
            ?.toLowerCase()
            .includes(partialName.toLowerCase()) ?? false,
        );
      }
    }
  }
  // 6. Verify pagination structure is valid
  TestValidator.predicate(
    "pagination exists",
    baselineResult.pagination !== undefined &&
      baselineResult.pagination !== null,
  );
  // 7. Verify data structure of variants
  for (const variant of baselineResult.data) {
    TestValidator.predicate("variant has id", variant.id !== undefined);
    TestValidator.predicate(
      "variant has sku_code",
      variant.sku_code !== undefined,
    );
    TestValidator.predicate(
      "variant has quantity",
      variant.quantity !== undefined,
    );
    TestValidator.predicate(
      "variant has in_stock status",
      typeof variant.in_stock === "boolean",
    );
    TestValidator.predicate(
      "variant has product info",
      variant.product !== undefined,
    );
  }
}