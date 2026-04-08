import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

export async function test_api_category_update_parent_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create first parent category (top-level)
  const firstParent =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: "First parent category for parent reassignment test",
        },
      },
    );
  typia.assert(firstParent);
  TestValidator.equals("first parent has no parent", firstParent.parent, null);
  // 3. Create second parent category (top-level)
  const secondParent =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: "Second parent category for parent reassignment test",
        },
      },
    );
  typia.assert(secondParent);
  TestValidator.equals(
    "second parent has no parent",
    secondParent.parent,
    null,
  );
  // 4. Create subcategory under first parent
  const subcategory =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: "Subcategory to be reassigned",
          parent_id: firstParent.id,
        },
      },
    );
  typia.assert(subcategory);
  TestValidator.equals(
    "subcategory parent is first parent",
    subcategory.parent?.id,
    firstParent.id,
  );
  // Store original updated_at for comparison
  const originalUpdatedAt = subcategory.updated_at;
  // 5. Reassign subcategory to second parent via PUT endpoint
  const updatedCategory =
    await api.functional.ecommerceMall.admin.admin.categories.update(
      adminConnection,
      {
        categoryId: subcategory.id,
        body: {
          parentId: secondParent.id,
        } satisfies IEcommerceMallCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);
  // 6. Validate the parent was successfully changed
  TestValidator.equals(
    "subcategory parent changed to second parent",
    updatedCategory.parent?.id,
    secondParent.id,
  );
  TestValidator.equals(
    "subcategory name preserved",
    updatedCategory.name,
    subcategory.name,
  );
  TestValidator.equals(
    "subcategory description preserved",
    updatedCategory.description,
    subcategory.description,
  );
  TestValidator.predicate(
    "updated_at refreshed after parent change",
    updatedCategory.updated_at !== originalUpdatedAt,
  );
}
