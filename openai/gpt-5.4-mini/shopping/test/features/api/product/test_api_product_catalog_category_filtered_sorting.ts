import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_mall_platform_administrator_categories_create } from "../../../generate/generate_random_mall_platform_administrator_categories_create";
import { prepare_random_mall_platform_category } from "../../../prepare/prepare_random_mall_platform_category";

export async function test_api_product_catalog_category_filtered_sorting(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const category: IMallPlatformCategory =
    await generate_random_mall_platform_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: `category-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IMallPlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  const baseRequest = {
    page: 1,
    limit: 100,
  } satisfies IMallPlatformProduct.IRequest;
  const allPage: IPageIMallPlatformProduct.ISummary =
    await api.functional.mallPlatform.administrator.products.index(
      adminConnection,
      {
        body: baseRequest,
      },
    );
  typia.assert(allPage);
  const categoryPage: IPageIMallPlatformProduct.ISummary =
    await api.functional.mallPlatform.administrator.products.index(
      adminConnection,
      {
        body: {
          ...baseRequest,
          categoryId: category.id,
        } satisfies IMallPlatformProduct.IRequest,
      },
    );
  typia.assert(categoryPage);
  TestValidator.predicate(
    "category-filtered results must belong to the requested category when any results are returned",
    () =>
      categoryPage.data.every(
        (product) =>
          product.category !== null && product.category.id === category.id,
      ),
  );
  TestValidator.predicate(
    "pagination metadata should be stable for the requested page size",
    allPage.pagination.current === 1 && allPage.pagination.limit === 100,
  );
  TestValidator.predicate(
    "category-filtered response should preserve the same page shape",
    categoryPage.pagination.current === 1 &&
      categoryPage.pagination.limit === 100,
  );
  for (const product of allPage.data) {
    typia.assert(product);
    TestValidator.predicate(
      "each product summary should include seller account information",
      product.sellerAccount.id.length > 0 &&
        product.sellerAccount.email.length > 0,
    );
    TestValidator.predicate(
      "each product summary should include lifecycle timestamps",
      product.createdAt.length > 0 && product.updatedAt.length > 0,
    );
  }
  const newestPage: IPageIMallPlatformProduct.ISummary =
    await api.functional.mallPlatform.administrator.products.index(
      adminConnection,
      {
        body: {
          ...baseRequest,
          sort: "newest",
        } satisfies IMallPlatformProduct.IRequest,
      },
    );
  typia.assert(newestPage);
  const priceAscPage: IPageIMallPlatformProduct.ISummary =
    await api.functional.mallPlatform.administrator.products.index(
      adminConnection,
      {
        body: {
          ...baseRequest,
          sort: "priceAsc",
        } satisfies IMallPlatformProduct.IRequest,
      },
    );
  typia.assert(priceAscPage);
  const priceDescPage: IPageIMallPlatformProduct.ISummary =
    await api.functional.mallPlatform.administrator.products.index(
      adminConnection,
      {
        body: {
          ...baseRequest,
          sort: "priceDesc",
        } satisfies IMallPlatformProduct.IRequest,
      },
    );
  typia.assert(priceDescPage);
  if (newestPage.data.length >= 2) {
    TestValidator.predicate(
      "newest sorting should not increase createdAt from one item to the next",
      () =>
        newestPage.data.every(
          (product, index, array) =>
            index === 0 || array[index - 1].createdAt >= product.createdAt,
        ),
    );
  }
  if (priceAscPage.data.length >= 2) {
    TestValidator.predicate(
      "price ascending sorting should not decrease base price from one item to the next",
      () =>
        priceAscPage.data.every(
          (product, index, array) =>
            index === 0 || array[index - 1].basePrice <= product.basePrice,
        ),
    );
  }
  if (priceDescPage.data.length >= 2) {
    TestValidator.predicate(
      "price descending sorting should not increase base price from one item to the next",
      () =>
        priceDescPage.data.every(
          (product, index, array) =>
            index === 0 || array[index - 1].basePrice >= product.basePrice,
        ),
    );
  }
}
