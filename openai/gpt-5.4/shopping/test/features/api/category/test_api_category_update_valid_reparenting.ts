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

export async function test_api_category_update_valid_reparenting(
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
      } satisfies IShoppingMallAdministrator.IJoin,
    },
  );
  typia.assert(administrator);
  const targetCategoryBody = {
    parentId: null,
    name: `target-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IShoppingMallCategory.ICreate;
  const targetCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      administratorConnection,
      {
        body: targetCategoryBody,
      },
    );
  typia.assert(targetCategory);
  const newParentCategoryBody = {
    parentId: null,
    name: `parent-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IShoppingMallCategory.ICreate;
  const newParentCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      administratorConnection,
      {
        body: newParentCategoryBody,
      },
    );
  typia.assert(newParentCategory);
  const updateBody = {
    name: `reparented-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.content({ paragraphs: 3 }),
    parent_id: newParentCategory.id,
  } satisfies IShoppingMallCategory.IUpdate;
  const updatedCategory =
    await api.functional.shoppingMall.administrator.categories.update(
      administratorConnection,
      {
        categoryId: targetCategory.id,
        body: updateBody,
      },
    );
  typia.assert(updatedCategory);
  TestValidator.equals(
    "category identity preserved",
    updatedCategory.id,
    targetCategory.id,
  );
  TestValidator.equals(
    "updated name applied",
    updatedCategory.name,
    updateBody.name,
  );
  TestValidator.equals(
    "updated description applied",
    updatedCategory.description,
    updateBody.description,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedCategory.created_at,
    targetCategory.created_at,
  );
  TestValidator.notEquals(
    "updated_at refreshed",
    updatedCategory.updated_at,
    targetCategory.updated_at,
  );
  TestValidator.equals(
    "category remains active",
    updatedCategory.deleted_at,
    null,
  );
  TestValidator.predicate(
    "parent relationship assigned",
    updatedCategory.parent !== null,
  );
  const parent = typia.assert(updatedCategory.parent!);
  TestValidator.equals(
    "parent id matches new parent",
    parent.id,
    newParentCategory.id,
  );
  TestValidator.equals(
    "parent name matches new parent",
    parent.name,
    newParentCategory.name,
  );
  TestValidator.equals(
    "parent description matches new parent",
    parent.description,
    newParentCategory.description,
  );
  TestValidator.equals("parent remains top-level", parent.parent, null);
}
