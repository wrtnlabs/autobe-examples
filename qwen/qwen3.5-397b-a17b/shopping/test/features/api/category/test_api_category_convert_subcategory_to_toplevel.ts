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

export async function test_api_category_convert_subcategory_to_toplevel(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create a top-level category (no parent)
  const topLevelCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_category_id: null,
        },
      },
    );
  typia.assert(topLevelCategory);
  TestValidator.predicate(
    "top-level category has no parent",
    topLevelCategory.parent === null,
  );
  // 3. Create a subcategory under the top-level category
  const subcategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_category_id: topLevelCategory.id,
        },
      },
    );
  typia.assert(subcategory);
  TestValidator.predicate(
    "subcategory has parent",
    subcategory.parent !== null,
  );
  TestValidator.equals(
    "subcategory parent matches top-level",
    subcategory.parent!.id,
    topLevelCategory.id,
  );
  // Store original timestamps for comparison
  const originalCreatedAt = subcategory.created_at;
  const originalUpdatedAt = subcategory.updated_at;
  // 4. Update the subcategory by setting parent_category_id to null
  const updatedCategory =
    await api.functional.shoppingMall.admin.categories.update(adminConnection, {
      categoryId: subcategory.id,
      body: {
        parent_category_id: null,
      } satisfies IShoppingMallCategory.IUpdate,
    });
  typia.assert(updatedCategory);
  // 5. Verify the response shows parent as null (now a top-level category)
  TestValidator.predicate(
    "converted category has no parent",
    updatedCategory.parent === null,
  );
  // 6. Verify the category retains its name and description
  TestValidator.equals(
    "name preserved",
    updatedCategory.name,
    subcategory.name,
  );
  TestValidator.equals(
    "description preserved",
    updatedCategory.description,
    subcategory.description,
  );
  // 7. Verify the updated_at timestamp has changed
  TestValidator.notEquals(
    "updated_at changed",
    updatedCategory.updated_at,
    originalUpdatedAt,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedCategory.created_at,
    originalCreatedAt,
  );
}
