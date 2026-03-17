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

export async function test_api_category_update_subcategory_depth_limit(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = {
    host: connection.host,
  };
  const authorized = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdministrator.IJoin,
    },
  );
  typia.assert(authorized);
  const topLevelParent =
    await generate_random_shopping_mall_administrator_categories_create(
      administratorConnection,
      {
        body: {
          name: `parent-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parentId: null,
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(topLevelParent);
  const existingSubcategory =
    await generate_random_shopping_mall_administrator_categories_create(
      administratorConnection,
      {
        body: {
          name: `child-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parentId: topLevelParent.id,
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(existingSubcategory);
  const originalTargetName = `target-${RandomGenerator.alphabets(8)}`;
  const originalTargetDescription = RandomGenerator.paragraph({ sentences: 4 });
  const targetCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      administratorConnection,
      {
        body: {
          name: originalTargetName,
          description: originalTargetDescription,
          parentId: topLevelParent.id,
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(targetCategory);
  TestValidator.equals(
    "target category starts under the valid top-level parent",
    targetCategory.parent?.id,
    topLevelParent.id,
  );
  TestValidator.equals(
    "target category starts with original name",
    targetCategory.name,
    originalTargetName,
  );
  TestValidator.equals(
    "target category starts with original description",
    targetCategory.description,
    originalTargetDescription,
  );
  await TestValidator.httpError(
    "reject update that would create third-level category nesting",
    [400, 409, 422],
    async () => {
      await api.functional.shoppingMall.administrator.categories.update(
        administratorConnection,
        {
          categoryId: targetCategory.id,
          body: {
            name: `invalid-${RandomGenerator.alphabets(8)}`,
            description: RandomGenerator.paragraph({ sentences: 5 }),
            parent_id: existingSubcategory.id,
          } satisfies IShoppingMallCategory.IUpdate,
        },
      );
    },
  );
  const replacementTopLevelParent =
    await generate_random_shopping_mall_administrator_categories_create(
      administratorConnection,
      {
        body: {
          name: `replacement-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parentId: null,
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(replacementTopLevelParent);
  const movedTarget =
    await api.functional.shoppingMall.administrator.categories.update(
      administratorConnection,
      {
        categoryId: targetCategory.id,
        body: {
          name: originalTargetName,
          description: originalTargetDescription,
          parent_id: replacementTopLevelParent.id,
        } satisfies IShoppingMallCategory.IUpdate,
      },
    );
  typia.assert(movedTarget);
  TestValidator.equals(
    "target category id remains unchanged after rejected hierarchy update",
    movedTarget.id,
    targetCategory.id,
  );
  TestValidator.equals(
    "target category name remains intact after rejected hierarchy update",
    movedTarget.name,
    originalTargetName,
  );
  TestValidator.equals(
    "target category description remains intact after rejected hierarchy update",
    movedTarget.description,
    originalTargetDescription,
  );
  TestValidator.equals(
    "target category can still be validly reassigned from its preserved state",
    movedTarget.parent?.id,
    replacementTopLevelParent.id,
  );
}
