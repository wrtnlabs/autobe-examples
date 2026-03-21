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

export async function test_api_category_update_name_and_description(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a new category to serve as the target for update testing
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(category);
  const originalName = category.name;
  const originalDescription = category.description;
  const originalUpdatedAt = category.updated_at;
  // 3. Prepare update data with new name and description
  const newName = RandomGenerator.paragraph({ sentences: 1 });
  const newDescription = RandomGenerator.paragraph({ sentences: 2 });
  // 4. Send PUT request to update the category
  const updatedCategory =
    await api.functional.ecommerceMall.admin.admin.categories.update(
      adminConnection,
      {
        categoryId: category.id,
        body: {
          name: newName,
          description: newDescription,
        } satisfies IEcommerceMallCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);
  // 5. Validate the returned category has the updated name and description
  TestValidator.equals("updated name", updatedCategory.name, newName);
  TestValidator.equals(
    "updated description",
    updatedCategory.description,
    newDescription,
  );
  // 6. Verify the original values are different from updated values
  TestValidator.notEquals("name changed", updatedCategory.name, originalName);
  TestValidator.notEquals(
    "description changed",
    updatedCategory.description,
    originalDescription,
  );
  // 7. Verify the updated_at timestamp reflects the update time
  TestValidator.predicate(
    "updated_at is refreshed",
    new Date(updatedCategory.updated_at) > new Date(originalUpdatedAt),
  );
  // 8. Confirm the category maintains its parent relationship and subcategories
  TestValidator.equals(
    "parent relationship maintained",
    updatedCategory.parent,
    category.parent,
  );
  TestValidator.equals(
    "subcategories maintained",
    updatedCategory.subcategories,
    category.subcategories,
  );
}
