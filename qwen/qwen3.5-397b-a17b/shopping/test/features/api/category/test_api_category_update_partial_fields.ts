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

export async function test_api_category_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  // 2. Create initial category
  const originalName = RandomGenerator.paragraph({ sentences: 2 });
  const originalDescription = RandomGenerator.content({ paragraphs: 2 });
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: originalName,
          description: originalDescription,
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(category);
  // 3. First partial update: update only name, keep description unchanged
  const newName = RandomGenerator.paragraph({ sentences: 2 });
  const updatedCategory1 =
    await api.functional.shoppingMall.administrator.categories.update(
      adminConnection,
      {
        categoryId: category.id,
        body: {
          name: newName,
        } satisfies IShoppingMallCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory1);
  // Validate first partial update
  TestValidator.equals(
    "name changed in first update",
    updatedCategory1.name,
    newName,
  );
  TestValidator.equals(
    "description unchanged in first update",
    updatedCategory1.description,
    originalDescription,
  );
  TestValidator.notEquals(
    "name differs from original",
    updatedCategory1.name,
    originalName,
  );
  // 4. Second partial update: update only description, keep new name unchanged
  const newDescription = RandomGenerator.content({ paragraphs: 2 });
  const updatedCategory2 =
    await api.functional.shoppingMall.administrator.categories.update(
      adminConnection,
      {
        categoryId: category.id,
        body: {
          description: newDescription,
        } satisfies IShoppingMallCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory2);
  // Validate second partial update
  TestValidator.equals(
    "name unchanged in second update",
    updatedCategory2.name,
    newName,
  );
  TestValidator.equals(
    "description changed in second update",
    updatedCategory2.description,
    newDescription,
  );
  TestValidator.notEquals(
    "description differs from original",
    updatedCategory2.description,
    originalDescription,
  );
}
