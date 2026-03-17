import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_category_delete_reclassifies_products_to_uncategorized(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = {
    host: connection.host,
  };
  const administrator = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(administrator);
  const categoryBody = {
    name: `category-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    parentId: null,
  } satisfies IShoppingMallCategory.ICreate;
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      administratorConnection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);
  TestValidator.equals(
    "created category name matches input",
    category.name,
    categoryBody.name,
  );
  TestValidator.equals(
    "created category description matches input",
    category.description,
    categoryBody.description,
  );
  TestValidator.equals("created category is top-level", category.parent, null);
  TestValidator.equals("created category is active", category.deleted_at, null);
  await api.functional.shoppingMall.administrator.categories.erase(
    administratorConnection,
    {
      categoryId: category.id,
    },
  );
  await TestValidator.error(
    "deleted category cannot be deleted again",
    async () => {
      await api.functional.shoppingMall.administrator.categories.erase(
        administratorConnection,
        {
          categoryId: category.id,
        },
      );
    },
  );
}
