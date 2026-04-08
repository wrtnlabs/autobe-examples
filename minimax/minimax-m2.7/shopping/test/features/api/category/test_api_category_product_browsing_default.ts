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

export async function test_api_category_product_browsing_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin submits admin request to get authorization
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      actorType: "customer",
      requestedGrade: "admin",
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://example.com/admin",
      referrer: "https://example.com",
    },
  });
  // 2. Admin creates a category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Call PATCH /ecommerceMall/categories/{categoryId}/products with empty body
  const response = await api.functional.ecommerceMall.categories.products.index(
    connection,
    {
      categoryId: category.id,
      body: {} satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(response);
  // 4. Validate response structure
  TestValidator.equals(
    "response has data array",
    Array.isArray(response.data),
    true,
  );
  TestValidator.equals(
    "response has pagination object",
    response.pagination !== null && typeof response.pagination === "object",
    true,
  );
  // 5. Verify pagination metadata (access via nested pagination.pagination)
  TestValidator.equals(
    "pagination current is 1",
    response.pagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20",
    response.pagination.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination records is defined",
    response.pagination.pagination.records !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination pages is defined",
    response.pagination.pagination.pages !== undefined,
    true,
  );
  // 6. Verify each product has required fields (when data exists)
  for (const product of response.data) {
    TestValidator.equals("product has id", product.id !== undefined, true);
    TestValidator.equals("product has name", product.name !== undefined, true);
    TestValidator.equals(
      "product has basePrice",
      product.basePrice !== undefined,
      true,
    );
    TestValidator.equals(
      "product has category",
      product.category !== undefined,
      true,
    );
    TestValidator.equals(
      "product has thumbnailUrl",
      product.thumbnailUrl !== undefined,
      true,
    );
    TestValidator.equals(
      "product has minVariantPrice",
      product.minVariantPrice !== undefined,
      true,
    );
    TestValidator.equals(
      "product has maxVariantPrice",
      product.maxVariantPrice !== undefined,
      true,
    );
    TestValidator.equals(
      "product has hasStock",
      product.hasStock !== undefined,
      true,
    );
    TestValidator.equals(
      "product has shopName",
      product.shopName !== undefined,
      true,
    );
    TestValidator.equals(
      "product has averageRating",
      product.averageRating !== undefined,
      true,
    );
    TestValidator.equals(
      "product has reviewsCount",
      product.reviewsCount !== undefined,
      true,
    );
    TestValidator.equals(
      "product has createdAt",
      product.createdAt !== undefined,
      true,
    );
    // 7. Verify products belong to the specified category
    TestValidator.equals(
      "product category matches",
      product.category.id,
      category.id,
    );
  }
  // 8. Verify products are sorted by createdAt descending (newest first)
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = new Date(response.data[i].createdAt).getTime();
      const next = new Date(response.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        `product ${i} createdAt is greater than or equal to product ${i + 1}`,
        current >= next,
      );
    }
  }
}
