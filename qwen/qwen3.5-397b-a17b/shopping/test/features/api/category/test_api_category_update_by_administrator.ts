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

export async function test_api_category_update_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create initial top-level category
  const initialCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          parent_id: null,
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(initialCategory);
  // 3. Prepare update data with new name and description
  const updatedName = RandomGenerator.paragraph({ sentences: 1 });
  const updatedDescription = RandomGenerator.content({ paragraphs: 2 });
  // 4. Update the category
  const updatedCategory =
    await api.functional.shoppingMall.administrator.categories.update(
      adminConnection,
      {
        categoryId: initialCategory.id,
        body: {
          name: updatedName,
          description: updatedDescription,
        } satisfies IShoppingMallCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);
  // 5. Validate the update results
  // Verify id remains unchanged
  TestValidator.equals(
    "category id unchanged",
    updatedCategory.id,
    initialCategory.id,
  );
  // Verify name was updated
  TestValidator.equals("name updated", updatedCategory.name, updatedName);
  // Verify description was updated
  TestValidator.equals(
    "description updated",
    updatedCategory.description,
    updatedDescription,
  );
  // Verify parent remains null (top-level category)
  TestValidator.equals("parent remains null", updatedCategory.parent, null);
  // Verify updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at changed",
    updatedCategory.updated_at,
    initialCategory.created_at,
  );
  // Verify updated_at is later than created_at
  TestValidator.predicate(
    "updated_at after created_at",
    new Date(updatedCategory.updated_at) > new Date(initialCategory.created_at),
  );
  // Verify deleted_at remains null (not soft-deleted)
  TestValidator.equals("not soft-deleted", updatedCategory.deleted_at, null);
}
