import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

export async function test_api_category_product_search_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      actorType: "customer",
      requestedGrade: "admin",
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      href: "https://example.com/admin",
      referrer: "https://example.com",
    },
  });
  // 2. Create a category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Test search with price_asc sort
  const priceAscResult =
    await api.functional.ecommerceMall.categories.products.index(connection, {
      categoryId: category.id,
      body: {
        q: "wireless",
        sort: "price_asc",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(priceAscResult);
  // 4. Validate pagination structure exists
  TestValidator.equals(
    "has pagination metadata",
    priceAscResult.pagination !== undefined,
    true,
  );
  // 5. Validate search results match category
  for (const product of priceAscResult.data) {
    TestValidator.equals(
      "product belongs to category",
      product.category.id,
      category.id,
    );
  }
  // 6. Validate price_asc sorting (products sorted by basePrice ascending)
  if (priceAscResult.data.length > 1) {
    for (let i = 0; i < priceAscResult.data.length - 1; i++) {
      TestValidator.predicate(
        "price_asc: current price <= next price",
        priceAscResult.data[i].basePrice <=
          priceAscResult.data[i + 1].basePrice,
      );
    }
  }
  // 7. Test search with price_desc sort
  const priceDescResult =
    await api.functional.ecommerceMall.categories.products.index(connection, {
      categoryId: category.id,
      body: {
        q: "wireless",
        sort: "price_desc",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(priceDescResult);
  // 8. Validate price_desc sorting (products sorted by basePrice descending)
  if (priceDescResult.data.length > 1) {
    for (let i = 0; i < priceDescResult.data.length - 1; i++) {
      TestValidator.predicate(
        "price_desc: current price >= next price",
        priceDescResult.data[i].basePrice >=
          priceDescResult.data[i + 1].basePrice,
      );
    }
  }
  // 9. Test search with newest sort
  const newestResult =
    await api.functional.ecommerceMall.categories.products.index(connection, {
      categoryId: category.id,
      body: {
        q: "wireless",
        sort: "newest",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(newestResult);
  // 10. Validate newest sorting (products sorted by createdAt descending)
  if (newestResult.data.length > 1) {
    for (let i = 0; i < newestResult.data.length - 1; i++) {
      const currentDate = new Date(newestResult.data[i].createdAt);
      const nextDate = new Date(newestResult.data[i + 1].createdAt);
      TestValidator.predicate(
        "newest: current date >= next date",
        currentDate >= nextDate,
      );
    }
  }
  // 11. Test without search query (retrieve all products in category)
  const allProductsResult =
    await api.functional.ecommerceMall.categories.products.index(connection, {
      categoryId: category.id,
      body: {
        sort: "newest",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(allProductsResult);
  // 12. Validate all products belong to the category
  for (const product of allProductsResult.data) {
    TestValidator.equals(
      "product belongs to category",
      product.category.id,
      category.id,
    );
  }
}