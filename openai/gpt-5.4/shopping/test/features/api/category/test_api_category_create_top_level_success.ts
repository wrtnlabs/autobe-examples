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

export async function test_api_category_create_top_level_success(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: undefined,
    },
  });
  const body = {
    name: `Top ${RandomGenerator.name(2)} ${RandomGenerator.alphabets(4)}`,
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 2,
      sentenceMax: 4,
      wordMin: 3,
      wordMax: 8,
    }),
    parentId: null,
  } satisfies IShoppingMallCategory.ICreate;
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      administratorConnection,
      {
        body,
      },
    );
  typia.assert<IShoppingMallCategory>(category);
  TestValidator.equals(
    "created category name matches input",
    category.name,
    body.name,
  );
  TestValidator.equals(
    "created category description matches input",
    category.description,
    body.description,
  );
  TestValidator.equals(
    "top-level category has null parent",
    category.parent,
    null,
  );
  TestValidator.equals("new category is active", category.deleted_at, null);
  TestValidator.equals(
    "new top-level category starts without immediate children",
    category.children.length,
    0,
  );
  TestValidator.predicate(
    "created_at is populated",
    category.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is populated",
    category.updated_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is not earlier than created_at",
    new Date(category.updated_at).getTime() >=
      new Date(category.created_at).getTime(),
  );
}
