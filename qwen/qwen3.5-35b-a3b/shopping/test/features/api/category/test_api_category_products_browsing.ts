import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_administrator_categories_create } from "../../../generate/generate_random_ecommerce_mall_administrator_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_category_products_browsing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate administrator and create test category
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: "Test Admin",
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(adminResult);
  const productCategory =
    await generate_random_ecommerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(productCategory);
  // 2. Authenticate seller and create products
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerResult);
  // Create 3 products in the test category
  const product1 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        category_id: productCategory.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product1);
  const product2 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        category_id: productCategory.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product2);
  const product3 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        category_id: productCategory.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product3);
  // 3. Fetch products in the category with default sorting
  const response = await api.functional.ecommerceMall.categories.products.index(
    connection,
    {
      categoryId: productCategory.id,
      body: {
        limit: 10,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(response);
  // 4. Validate response structure
  TestValidator.equals("response has pagination", response.pagination, {
    current: 1,
    limit: 10,
    records: 3,
    pages: 1,
  });
  // 5. Validate data array
  TestValidator.equals("data array length", response.data.length, 3);
  // 6. Validate each product has correct category reference
  for (const product of response.data) {
    typia.assert(product);
    typia.assert(product.category);
    typia.assert(product.seller);
    TestValidator.equals(
      "product belongs to category",
      product.category.id,
      productCategory.id,
    );
    TestValidator.predicate(
      "product has seller",
      product.seller.id !== undefined,
    );
    TestValidator.predicate(
      "product has required fields",
      product.name !== undefined,
    );
    TestValidator.predicate(
      "product has base price",
      typeof product.base_price === "number",
    );
    TestValidator.predicate(
      "product has availability status",
      typeof product.availability_status === "string",
    );
    TestValidator.predicate(
      "product has variants flag",
      typeof product.has_available_variants === "boolean",
    );
  }
  // 7. Test sorting by name ascending
  const sortedByName =
    await api.functional.ecommerceMall.categories.products.index(connection, {
      categoryId: productCategory.id,
      body: {
        sortBy: "name",
        sortOrder: "asc",
        limit: 10,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(sortedByName);
  TestValidator.equals(
    "sorted by name ascending",
    sortedByName.pagination.records,
    3,
  );
  // 8. Test sorting by price ascending
  const sortedByPrice =
    await api.functional.ecommerceMall.categories.products.index(connection, {
      categoryId: productCategory.id,
      body: {
        sortBy: "base_price",
        sortOrder: "asc",
        limit: 10,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(sortedByPrice);
  TestValidator.equals(
    "sorted by price ascending",
    sortedByPrice.pagination.records,
    3,
  );
  // 9. Test empty category (create new category with no products)
  const emptyCategory =
    await generate_random_ecommerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(emptyCategory);
  const emptyResponse =
    await api.functional.ecommerceMall.categories.products.index(connection, {
      categoryId: emptyCategory.id,
      body: {
        limit: 10,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(emptyResponse);
  TestValidator.equals("empty category pagination", emptyResponse.pagination, {
    current: 1,
    limit: 10,
    records: 0,
    pages: 0,
  });
  TestValidator.equals("empty category data", emptyResponse.data.length, 0);
}
