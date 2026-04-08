import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_product_search_sort_by_price_and_rating(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection for authenticated access
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Test default search (newest - created_at DESC)
  const newestResults =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
      {
        body: {
          search: null,
          categoryId: null,
          subcategoryId: null,
          minPrice: null,
          maxPrice: null,
          inStockOnly: null,
          sortBy: "newest",
          page: null,
          limit: null,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(newestResults);
  // 3. Test price ascending sort
  const priceAscResults =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
      {
        body: {
          search: null,
          categoryId: null,
          subcategoryId: null,
          minPrice: null,
          maxPrice: null,
          inStockOnly: null,
          sortBy: "priceAsc",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(priceAscResults);
  // 4. Test price descending sort
  const priceDescResults =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
      {
        body: {
          search: null,
          categoryId: null,
          subcategoryId: null,
          minPrice: null,
          maxPrice: null,
          inStockOnly: null,
          sortBy: "priceDesc",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(priceDescResults);
  // 5. Test combined filters with price sort
  const combinedResults =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
      {
        body: {
          search: null,
          categoryId: null,
          subcategoryId: null,
          minPrice: 1000,
          maxPrice: 50000,
          inStockOnly: true,
          sortBy: "priceAsc",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(combinedResults);
  // 6. Validate that price range filter was applied
  for (const product of combinedResults.data) {
    TestValidator.predicate(
      `product ${product.id} basePrice ${product.basePrice} within range [1000, 50000]`,
      product.basePrice >= 1000 && product.basePrice <= 50000,
    );
  }
  // 7. Validate sorting order
  if (priceAscResults.data.length > 1) {
    for (let i = 1; i < priceAscResults.data.length; i++) {
      const prevPrice = priceAscResults.data[i - 1].basePrice;
      const currPrice = priceAscResults.data[i].basePrice;
      TestValidator.predicate(
        "priceAsc sort: each product price should be >= previous",
        currPrice >= prevPrice,
      );
    }
  }
  if (priceDescResults.data.length > 1) {
    for (let i = 1; i < priceDescResults.data.length; i++) {
      const prevPrice = priceDescResults.data[i - 1].basePrice;
      const currPrice = priceDescResults.data[i].basePrice;
      TestValidator.predicate(
        "priceDesc sort: each product price should be <= previous",
        currPrice <= prevPrice,
      );
    }
  }
  // 8. Validate product summary structure (category, seller, priceRange)
  for (const product of priceAscResults.data.slice(0, 3)) {
    typia.assert(product.category);
    typia.assert(product.seller);
    typia.assert(product.priceRange);
    TestValidator.predicate(
      "priceRange minPrice <= maxPrice",
      product.priceRange.minPrice <= product.priceRange.maxPrice,
    );
  }
}
