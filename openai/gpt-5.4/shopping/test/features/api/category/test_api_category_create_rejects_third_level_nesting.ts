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

export async function test_api_category_create_rejects_third_level_nesting(
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
  const topLevelInput = {
    name: `top-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    parentId: null,
  } satisfies IShoppingMallCategory.ICreate;
  const topLevelCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      administratorConnection,
      {
        body: topLevelInput,
      },
    );
  typia.assert(topLevelCategory);
  const subcategoryInput = {
    name: `sub-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    parentId: topLevelCategory.id,
  } satisfies IShoppingMallCategory.ICreate;
  const subcategory =
    await generate_random_shopping_mall_administrator_categories_create(
      administratorConnection,
      {
        body: subcategoryInput,
      },
    );
  typia.assert(subcategory);
  TestValidator.equals(
    "top-level name matches input",
    topLevelCategory.name,
    topLevelInput.name,
  );
  TestValidator.equals(
    "top-level description matches input",
    topLevelCategory.description,
    topLevelInput.description,
  );
  TestValidator.equals(
    "top-level parent is null",
    topLevelCategory.parent,
    null,
  );
  TestValidator.equals(
    "subcategory name matches input",
    subcategory.name,
    subcategoryInput.name,
  );
  TestValidator.equals(
    "subcategory description matches input",
    subcategory.description,
    subcategoryInput.description,
  );
  TestValidator.notEquals(
    "subcategory parent exists",
    subcategory.parent,
    null,
  );
  TestValidator.equals(
    "subcategory parent id matches top-level category",
    subcategory.parent?.id,
    topLevelCategory.id,
  );
  TestValidator.equals(
    "subcategory parent name matches top-level category",
    subcategory.parent?.name,
    topLevelCategory.name,
  );
  TestValidator.equals(
    "subcategory parent description matches top-level category",
    subcategory.parent?.description,
    topLevelCategory.description,
  );
  TestValidator.equals("subcategory has no children", subcategory.children, []);
  const invalidThirdLevelInput = {
    name: `third-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    parentId: subcategory.id,
  } satisfies IShoppingMallCategory.ICreate;
  await TestValidator.error("reject third-level category nesting", async () => {
    await generate_random_shopping_mall_administrator_categories_create(
      administratorConnection,
      {
        body: invalidThirdLevelInput,
      },
    );
  });
  TestValidator.equals(
    "top-level category remains top-level",
    topLevelCategory.parent,
    null,
  );
  TestValidator.equals(
    "subcategory remains under top-level category",
    subcategory.parent?.id,
    topLevelCategory.id,
  );
  TestValidator.equals(
    "subcategory children remain empty",
    subcategory.children,
    [],
  );
}
