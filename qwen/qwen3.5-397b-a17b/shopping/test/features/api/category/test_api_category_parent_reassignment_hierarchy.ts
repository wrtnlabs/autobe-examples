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

export async function test_api_category_parent_reassignment_hierarchy(
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
  // 2. Create first top-level category (parent A)
  const parentA = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        parent_category_id: null,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(parentA);
  TestValidator.predicate("parent A is top-level", parentA.parent === null);
  // 3. Create second top-level category (parent B)
  const parentB = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        parent_category_id: null,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(parentB);
  TestValidator.predicate("parent B is top-level", parentB.parent === null);
  TestValidator.notEquals("parent IDs differ", parentA.id, parentB.id);
  // 4. Create a subcategory under parent A
  const subcategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_category_id: parentA.id,
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(subcategory);
  TestValidator.equals(
    "subcategory initially under parent A",
    subcategory.parent?.id,
    parentA.id,
  );
  // Store original updated_at for comparison
  const originalUpdatedAt = subcategory.updated_at;
  // 5. Update the subcategory to change its parent from A to B
  const updatedSubcategory =
    await api.functional.shoppingMall.admin.categories.update(adminConnection, {
      categoryId: subcategory.id,
      body: {
        parent_category_id: parentB.id,
      } satisfies IShoppingMallCategory.IUpdate,
    });
  typia.assert(updatedSubcategory);
  // 6. Verify the subcategory's parent now points to parent B
  TestValidator.equals(
    "subcategory parent reassigned to parent B",
    updatedSubcategory.parent?.id,
    parentB.id,
  );
  TestValidator.notEquals(
    "parent changed from A to B",
    updatedSubcategory.parent?.id,
    parentA.id,
  );
  // 7. Verify the updated_at timestamp reflects the change
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedSubcategory.updated_at,
    originalUpdatedAt,
  );
  TestValidator.predicate(
    "updated_at is later than original",
    new Date(updatedSubcategory.updated_at).getTime() >
      new Date(originalUpdatedAt).getTime(),
  );
  // Additional validation: verify other fields remain unchanged
  TestValidator.equals(
    "subcategory name unchanged",
    updatedSubcategory.name,
    subcategory.name,
  );
  TestValidator.equals(
    "subcategory description unchanged",
    updatedSubcategory.description,
    subcategory.description,
  );
  TestValidator.equals(
    "subcategory id unchanged",
    updatedSubcategory.id,
    subcategory.id,
  );
}
