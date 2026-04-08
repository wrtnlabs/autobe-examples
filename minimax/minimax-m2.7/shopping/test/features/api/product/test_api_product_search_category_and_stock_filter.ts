import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_product_search_category_and_stock_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Establish guest session
  const guestAuth = await authorize_guest_join(connection, {
    body: {
      fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create guest-specific connection with auth token
  const guestConnection: api.IConnection = { host: connection.host };
  guestConnection.headers = {
    Authorization: `Bearer ${guestAuth.token.access}`,
  };
  // 3. Test search with inStock=true
  const inStockResult =
    await api.functional.ecommerceMall.guest.products.search.index(
      guestConnection,
      {
        body: {
          inStock: true,
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(inStockResult);
  // 4. Validate inStock=true filters correctly
  TestValidator.predicate("inStock=true returns products with stock", () =>
    inStockResult.data.every((p) => p.hasStock === true),
  );
  // 5. Test search with inStock=false
  const outOfStockResult =
    await api.functional.ecommerceMall.guest.products.search.index(
      guestConnection,
      {
        body: {
          inStock: false,
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(outOfStockResult);
  // 6. Test search with categoryId filter
  if (inStockResult.data.length > 0) {
    const sampleProduct = inStockResult.data[0];
    const categoryFilteredResult =
      await api.functional.ecommerceMall.guest.products.search.index(
        guestConnection,
        {
          body: {
            categoryId: sampleProduct.category.id,
            page: 1,
            limit: 20,
          } satisfies IEcommerceMallProduct.IRequest,
        },
      );
    typia.assert(categoryFilteredResult);
    // Validate all products belong to the specified category
    TestValidator.predicate(
      "categoryId filter returns products in correct category",
      () =>
        categoryFilteredResult.data.every(
          (p) => p.category.id === sampleProduct.category.id,
        ),
    );
    // Validate category summary structure
    TestValidator.predicate("category summary has required fields", () =>
      categoryFilteredResult.data.every(
        (p) =>
          p.category &&
          typeof p.category.id === "string" &&
          typeof p.category.name === "string",
      ),
    );
    // 7. Test combined categoryId + inStock filter
    const combinedResult =
      await api.functional.ecommerceMall.guest.products.search.index(
        guestConnection,
        {
          body: {
            categoryId: sampleProduct.category.id,
            inStock: true,
            page: 1,
            limit: 20,
          } satisfies IEcommerceMallProduct.IRequest,
        },
      );
    typia.assert(combinedResult);
    TestValidator.predicate(
      "combined filter returns products matching both criteria",
      () =>
        combinedResult.data.every(
          (p) =>
            p.category.id === sampleProduct.category.id && p.hasStock === true,
        ),
    );
  }
  // 8. Test price range filtering (minPrice only)
  const minPriceResult =
    await api.functional.ecommerceMall.guest.products.search.index(
      guestConnection,
      {
        body: {
          minPrice: 10,
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(minPriceResult);
  TestValidator.predicate(
    "minPrice filter excludes products below threshold",
    () => minPriceResult.data.every((p) => p.minVariantPrice >= 10),
  );
  // 9. Test price range filtering (maxPrice only)
  const maxPriceResult =
    await api.functional.ecommerceMall.guest.products.search.index(
      guestConnection,
      {
        body: {
          maxPrice: 100,
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(maxPriceResult);
  TestValidator.predicate(
    "maxPrice filter excludes products above threshold",
    () => maxPriceResult.data.every((p) => p.basePrice <= 100),
  );
  // 10. Test combined price range (minPrice + maxPrice)
  const priceRangeResult =
    await api.functional.ecommerceMall.guest.products.search.index(
      guestConnection,
      {
        body: {
          minPrice: 10,
          maxPrice: 100,
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(priceRangeResult);
  TestValidator.predicate(
    "price range filter excludes products outside bounds",
    () =>
      priceRangeResult.data.every(
        (p) => p.minVariantPrice >= 10 && p.basePrice <= 100,
      ),
  );
  // 11. Test combined filters: categoryId + minPrice + maxPrice + inStock
  if (inStockResult.data.length > 0) {
    const sampleProduct = inStockResult.data[0];
    const fullFilterResult =
      await api.functional.ecommerceMall.guest.products.search.index(
        guestConnection,
        {
          body: {
            categoryId: sampleProduct.category.id,
            minPrice: 5,
            maxPrice: 200,
            inStock: true,
            page: 1,
            limit: 20,
          } satisfies IEcommerceMallProduct.IRequest,
        },
      );
    typia.assert(fullFilterResult);
    TestValidator.predicate("full filter combination works correctly", () =>
      fullFilterResult.data.every(
        (p) =>
          p.category.id === sampleProduct.category.id &&
          p.minVariantPrice >= 5 &&
          p.basePrice <= 200 &&
          p.hasStock === true,
      ),
    );
  }
}
