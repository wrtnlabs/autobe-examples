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

export async function test_api_product_catalog_admin_browse(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const category =
    await generate_random_mall_platform_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IMallPlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  const page = await api.functional.mallPlatform.administrator.products.index(
    adminConnection,
    {
      body: {
        categoryId: category.id,
        search: category.name,
        inStockOnly: true,
        sort: "newest",
        page: 1,
        limit: 20,
      } satisfies IMallPlatformProduct.IRequest,
    },
  );
  typia.assert(page);
  TestValidator.predicate(
    "pagination current page is valid",
    page.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    page.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records are non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages are non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate("data is an array", Array.isArray(page.data));
  for (const product of page.data) {
    typia.assert(product);
    TestValidator.equals(
      "category filter should match",
      product.category?.id,
      category.id,
    );
  }
  const emptyPage =
    await api.functional.mallPlatform.administrator.products.index(
      adminConnection,
      {
        body: {
          categoryId: category.id,
          search: RandomGenerator.alphaNumeric(24),
          page: 1,
          limit: 20,
        } satisfies IMallPlatformProduct.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals(
    "empty matching result should return zero records",
    emptyPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty matching result should return empty data",
    emptyPage.data.length,
    0,
  );
}
