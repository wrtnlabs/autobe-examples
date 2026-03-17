import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

export async function test_api_category_browsing_excludes_deleted_and_returns_empty_page(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = {
    host: connection.host,
  };
  const administrator = typia.assert(
    await authorize_administrator_join(administratorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    }),
  );
  const uniqueToken = RandomGenerator.alphaNumeric(8);
  const categoryName = `active-category-${uniqueToken}`;
  const categoryDescription = `description-${uniqueToken}-${RandomGenerator.paragraph({ sentences: 3 })}`;
  const createBody = {
    name: categoryName,
    description: categoryDescription,
    parentId: null,
  } satisfies IShoppingMallCategory.ICreate;
  const createdCategory = typia.assert(
    await generate_random_shopping_mall_administrator_categories_create(
      administratorConnection,
      {
        body: createBody,
      },
    ),
  );
  TestValidator.equals(
    "administrator email matches authorization response",
    administrator.email,
    administrator.email,
  );
  TestValidator.equals(
    "created category name matches input",
    createdCategory.name,
    createBody.name,
  );
  TestValidator.equals(
    "created category description matches input",
    createdCategory.description,
    createBody.description,
  );
  TestValidator.equals(
    "created category is active",
    createdCategory.deleted_at,
    null,
  );
  const browseRequest = {
    search: categoryName,
    isTopLevel: true,
    page: 1,
    limit: 10,
  } satisfies IShoppingMallCategory.IRequest;
  const beforeDeletionPage = typia.assert(
    await api.functional.shoppingMall.administrator.categories.index(
      administratorConnection,
      {
        body: browseRequest,
      },
    ),
  );
  TestValidator.predicate(
    "created category appears before deletion",
    ArrayUtil.has(
      beforeDeletionPage.data,
      (category) => category.id === createdCategory.id,
    ),
  );
  const matchedBeforeDeletion = beforeDeletionPage.data.find(
    (category) => category.id === createdCategory.id,
  );
  TestValidator.predicate(
    "matched category is exposed as active before deletion",
    matchedBeforeDeletion !== undefined &&
      matchedBeforeDeletion.deleted_at === null,
  );
  await api.functional.shoppingMall.administrator.categories.erase(
    administratorConnection,
    {
      categoryId: createdCategory.id,
    },
  );
  const afterDeletionPage = typia.assert(
    await api.functional.shoppingMall.administrator.categories.index(
      administratorConnection,
      {
        body: browseRequest,
      },
    ),
  );
  TestValidator.predicate(
    "deleted category no longer appears in active browsing",
    ArrayUtil.has(
      afterDeletionPage.data,
      (category) => category.id === createdCategory.id,
    ) === false,
  );
  TestValidator.equals(
    "empty page is returned when no active categories match",
    afterDeletionPage.data.length,
    0,
  );
}
