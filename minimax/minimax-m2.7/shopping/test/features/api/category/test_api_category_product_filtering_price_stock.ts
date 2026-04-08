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

export async function test_api_category_product_filtering_price_stock(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      actorType: "customer",
      requestedGrade: "admin",
      reason: "Need admin access for testing category product filtering",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  // 2. Create a category for filtering test
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Call PATCH /ecommerceMall/categories/{categoryId}/products with price and stock filters
  const response = await api.functional.ecommerceMall.categories.products.index(
    adminConnection,
    {
      categoryId: category.id,
      body: {
        minPrice: 50,
        maxPrice: 200,
        inStock: true,
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(response);
  // 4. Validate response structure
  TestValidator.equals("pagination exists", response.pagination !== null, true);
  TestValidator.equals("data array exists", Array.isArray(response.data), true);
  // 5. Verify all returned products have prices within range
  for (const product of response.data) {
    TestValidator.predicate(
      `product ${product.id} basePrice >= 50`,
      product.basePrice >= 50,
    );
    TestValidator.predicate(
      `product ${product.id} basePrice <= 200`,
      product.basePrice <= 200,
    );
  }
  // 6. Verify all returned products have hasStock = true
  for (const product of response.data) {
    TestValidator.equals(
      `product ${product.id} hasStock is true`,
      product.hasStock,
      true,
    );
  }
  // 7. Verify all products belong to the specified category
  for (const product of response.data) {
    TestValidator.equals(
      `product ${product.id} belongs to category ${category.id}`,
      product.category.id,
      category.id,
    );
  }
  // 8. Verify pagination metadata
  TestValidator.predicate(
    "pagination current is at least 1",
    response.pagination.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pagination.pages >= 0,
  );
}
