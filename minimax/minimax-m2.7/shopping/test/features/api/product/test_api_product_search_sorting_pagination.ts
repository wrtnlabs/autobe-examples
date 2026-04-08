import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_product_search_sorting_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: "https://example.com/seller/register",
      referrer: "https://google.com",
    },
  });
  typia.assert(seller);
  // 2. Create 8 products with different base prices for sorting tests
  const basePrices = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000];
  const products: IEcommerceMallProduct[] = [];
  for (const basePrice of basePrices) {
    const product = await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: `Test Product Price ${basePrice}`,
          description: `Product with base price ${basePrice}`,
          basePrice: basePrice,
        },
      },
    );
    products.push(product);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  // 3. Test sort='newest' (default - created_at DESC)
  const newestResult = await api.functional.ecommerceMall.products.index(
    sellerConnection,
    {
      body: {
        sort: "newest",
        limit: 20,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(newestResult);
  TestValidator.predicate(
    "newest sort has products",
    newestResult.data.length > 0,
  );
  if (newestResult.data.length >= 2) {
    const firstCreatedAt = new Date(newestResult.data[0].createdAt).getTime();
    const secondCreatedAt = new Date(newestResult.data[1].createdAt).getTime();
    TestValidator.predicate(
      "newest sort: first product created after second",
      firstCreatedAt >= secondCreatedAt,
    );
  }
  // 4. Test sort='price_asc' (base_price ASC)
  const priceAscResult = await api.functional.ecommerceMall.products.index(
    sellerConnection,
    {
      body: {
        sort: "price_asc",
        limit: 20,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(priceAscResult);
  TestValidator.predicate(
    "price_asc sort has products",
    priceAscResult.data.length > 0,
  );
  for (let i = 1; i < priceAscResult.data.length; i++) {
    TestValidator.predicate(
      `price_asc sort: product ${i} price >= product ${i - 1} price`,
      priceAscResult.data[i].basePrice >= priceAscResult.data[i - 1].basePrice,
    );
  }
  // 5. Test sort='price_desc' (base_price DESC)
  const priceDescResult = await api.functional.ecommerceMall.products.index(
    sellerConnection,
    {
      body: {
        sort: "price_desc",
        limit: 20,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(priceDescResult);
  TestValidator.predicate(
    "price_desc sort has products",
    priceDescResult.data.length > 0,
  );
  for (let i = 1; i < priceDescResult.data.length; i++) {
    TestValidator.predicate(
      `price_desc sort: product ${i} price <= product ${i - 1} price`,
      priceDescResult.data[i].basePrice <=
        priceDescResult.data[i - 1].basePrice,
    );
  }
  // 6. Test pagination with page parameter (page 1, limit 3)
  const page1Result = await api.functional.ecommerceMall.products.index(
    sellerConnection,
    {
      body: {
        sort: "newest",
        page: 1,
        limit: 3,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(page1Result);
  const paginationMeta1 =
    page1Result.pagination as IPageIEcommerceMall.IPagination;
  if (paginationMeta1 !== null) {
    const meta1 = paginationMeta1.pagination as IPage.IPagination;
    TestValidator.equals("page 1 current page", meta1.current, 1);
    TestValidator.equals("page 1 limit", meta1.limit, 3);
  }
  TestValidator.predicate(
    "page 1 has at most 3 items",
    page1Result.data.length <= 3,
  );
  // 7. Test pagination with page 2
  const page2Result = await api.functional.ecommerceMall.products.index(
    sellerConnection,
    {
      body: {
        sort: "newest",
        page: 2,
        limit: 3,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(page2Result);
  const paginationMeta2 =
    page2Result.pagination as IPageIEcommerceMall.IPagination;
  if (paginationMeta2 !== null) {
    const meta2 = paginationMeta2.pagination as IPage.IPagination;
    TestValidator.equals("page 2 current page", meta2.current, 2);
    TestValidator.equals("page 2 limit", meta2.limit, 3);
  }
  if (page1Result.data.length > 0 && page2Result.data.length > 0) {
    const page1Ids = page1Result.data.map((p) => p.id);
    const page2Ids = page2Result.data.map((p) => p.id);
    const hasOverlap = page1Ids.some((id) => page2Ids.includes(id));
    TestValidator.equals(
      "no overlap between page 1 and page 2",
      hasOverlap,
      false,
    );
  }
  // 8. Test pagination metadata accuracy
  if (paginationMeta1 !== null) {
    const meta1 = paginationMeta1.pagination as IPage.IPagination;
    TestValidator.predicate("pagination records >= 0", meta1.records >= 0);
    TestValidator.predicate("pagination pages >= 0", meta1.pages >= 0);
    const expectedPages = Math.ceil(meta1.records / 3);
    TestValidator.equals(
      "pagination pages calculation correct",
      meta1.pages,
      expectedPages,
    );
  }
  // 9. Test limit parameter with different values
  const limitResult = await api.functional.ecommerceMall.products.index(
    sellerConnection,
    {
      body: {
        sort: "newest",
        limit: 50,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(limitResult);
  const paginationLimit =
    limitResult.pagination as IPageIEcommerceMall.IPagination;
  if (paginationLimit !== null) {
    const metaLimit = paginationLimit.pagination as IPage.IPagination;
    TestValidator.equals("limit 50 applied correctly", metaLimit.limit, 50);
  }
  TestValidator.predicate(
    "limit result has at most 50 items",
    limitResult.data.length <= 50,
  );
  // 10. Test default pagination (no page/limit specified - should default to page 1)
  const defaultResult = await api.functional.ecommerceMall.products.index(
    sellerConnection,
    {
      body: {
        sort: "newest",
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(defaultResult);
  const paginationDefault =
    defaultResult.pagination as IPageIEcommerceMall.IPagination;
  if (paginationDefault !== null) {
    const metaDefault = paginationDefault.pagination as IPage.IPagination;
    TestValidator.equals("default page is 1", metaDefault.current, 1);
    TestValidator.predicate(
      "default limit is set (should be 20)",
      metaDefault.limit > 0,
    );
  }
}
