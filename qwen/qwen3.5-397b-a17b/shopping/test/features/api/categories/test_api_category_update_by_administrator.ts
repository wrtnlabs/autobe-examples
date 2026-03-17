import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

export async function test_api_category_update_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create a test category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(category);
  // Store original values for comparison
  const originalCreatedAt = category.created_at;
  const originalUpdatedAt = category.updated_at;
  // 3. Update the category with new values
  const newName = RandomGenerator.paragraph({ sentences: 1 });
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updatedCategory =
    await api.functional.shoppingMall.admin.categories.update(adminConnection, {
      categoryId: category.id,
      body: {
        name: newName,
        description: newDescription,
      } satisfies IShoppingMallCategory.IUpdate,
    });
  typia.assert(updatedCategory);
  // 4. Validate updated fields match the input
  TestValidator.equals("name updated", updatedCategory.name, newName);
  TestValidator.equals(
    "description updated",
    updatedCategory.description,
    newDescription,
  );
  // 5. Validate immutable fields remain unchanged
  TestValidator.equals("id unchanged", updatedCategory.id, category.id);
  TestValidator.equals(
    "created_at unchanged",
    updatedCategory.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedCategory.updated_at,
    originalUpdatedAt,
  );
  // 6. Validate updated_at is newer than original
  TestValidator.predicate(
    "updated_at is after original",
    new Date(updatedCategory.updated_at) > new Date(originalUpdatedAt),
  );
}
