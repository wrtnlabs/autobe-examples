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

export async function test_api_category_top_level_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create a top-level category (no parent)
  const categoryCreateInput: IShoppingMallCategory.ICreate = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    parent_category_id: null,
  };
  const createdCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      { body: categoryCreateInput },
    );
  typia.assert(createdCategory);
  // 3. Retrieve the category by ID
  const retrievedCategory = await api.functional.shoppingMall.categories.at(
    adminConnection,
    {
      categoryId: createdCategory.id,
    },
  );
  typia.assert(retrievedCategory);
  // 4. Validate category is top-level (parent is null)
  TestValidator.equals(
    "parent is null for top-level category",
    retrievedCategory.parent,
    null,
  );
  // 5. Validate category is active (not soft-deleted)
  TestValidator.equals(
    "category is active",
    retrievedCategory.deleted_at,
    null,
  );
  // 6. Validate category fields match created data
  TestValidator.equals(
    "category id matches",
    retrievedCategory.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "category name matches",
    retrievedCategory.name,
    createdCategory.name,
  );
  TestValidator.equals(
    "category description matches",
    retrievedCategory.description,
    createdCategory.description,
  );
}
