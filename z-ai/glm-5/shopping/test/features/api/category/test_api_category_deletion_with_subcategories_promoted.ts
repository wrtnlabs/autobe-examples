import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
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

export async function test_api_category_deletion_with_subcategories_promoted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection and authenticate
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
  // 2. Create parent category (top-level)
  const parentCategory =
    await api.functional.shoppingMall.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(parentCategory);
  TestValidator.equals("parent is top-level", parentCategory.parent, null);
  // 3. Create subcategory under the parent category
  const subcategory =
    await api.functional.shoppingMall.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parent_id: parentCategory.id,
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(subcategory);
  TestValidator.predicate(
    "subcategory has parent",
    subcategory.parent !== null,
  );
  TestValidator.equals(
    "subcategory parent matches parent category id",
    subcategory.parent!.id,
    parentCategory.id,
  );
  // 4. Delete the parent category - should succeed and promote subcategories
  await api.functional.shoppingMall.administrator.categories.erase(
    adminConnection,
    {
      categoryId: parentCategory.id,
    },
  );
  // 5. Verify parent is soft-deleted by attempting to create subcategory under it
  // This should fail because the parent category no longer exists (soft-deleted)
  await TestValidator.error(
    "cannot create subcategory under deleted parent",
    async () => {
      await api.functional.shoppingMall.administrator.categories.create(
        adminConnection,
        {
          body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 3 }),
            parent_id: parentCategory.id,
          } satisfies IShoppingMallCategory.ICreate,
        },
      );
    },
  );
}
