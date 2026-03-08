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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

export async function test_api_category_update_name_and_description(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create a category to update
  const originalCategory: IEcommerceMallCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(originalCategory);
  // 3. Prepare update data
  const newName = RandomGenerator.name(2);
  const newDescription = RandomGenerator.paragraph({ sentences: 5 });
  const oldUpdatedAt: string = originalCategory.updated_at;
  // 4. Update the category
  const updatedCategory: IEcommerceMallCategory =
    await api.functional.ecommerceMall.admin.categories.update(
      adminConnection,
      {
        categoryId: originalCategory.id,
        body: {
          name: newName,
          description: newDescription,
        } satisfies IEcommerceMallCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);
  // 5. Validate the update results
  TestValidator.equals("name updated", updatedCategory.name, newName);
  TestValidator.equals(
    "description updated",
    updatedCategory.description,
    newDescription,
  );
  TestValidator.equals("ID preserved", updatedCategory.id, originalCategory.id);
  TestValidator.equals(
    "parent_id preserved",
    updatedCategory.parent_id,
    originalCategory.parent_id,
  );
  TestValidator.equals(
    "subcategories preserved",
    updatedCategory.subcategories,
    originalCategory.subcategories,
  );
  TestValidator.predicate(
    "updated_at refreshed",
    updatedCategory.updated_at > oldUpdatedAt,
  );
  TestValidator.equals(
    "created_at preserved",
    updatedCategory.created_at,
    originalCategory.created_at,
  );
  TestValidator.predicate(
    "deleted_at is null",
    updatedCategory.deleted_at === null,
  );
}