import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_ecommerce_administrator_categories_create } from "../../../generate/generate_random_ecommerce_administrator_categories_create";
import { prepare_random_ecommerce_category } from "../../../prepare/prepare_random_ecommerce_category";

export async function test_api_admin_category_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // Create an initial category to update
  const category =
    await generate_random_ecommerce_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceCategory.ICreate,
      },
    );
  typia.assert(category);
  // Store original timestamps for comparison
  const originalCreatedAt = category.created_at;
  const originalUpdatedAt = category.updated_at;
  // Update the category with new values
  const updatedCategory =
    await api.functional.ecommerce.administrator.categories.update(
      adminConnection,
      {
        categoryId: category.id,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IEcommerceCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);
  // Validate that the category was successfully updated
  TestValidator.equals(
    "category id should remain the same",
    updatedCategory.id,
    category.id,
  );
  TestValidator.notEquals(
    "name should be updated",
    updatedCategory.name,
    category.name,
  );
  TestValidator.notEquals(
    "description should be updated",
    updatedCategory.description,
    category.description,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedCategory.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at should be changed",
    updatedCategory.updated_at,
    originalUpdatedAt,
  );
  TestValidator.equals(
    "parent_category_id should remain null",
    updatedCategory.parent_category_id,
    null,
  );
  TestValidator.equals(
    "parent should remain null",
    updatedCategory.parent,
    null,
  );
  TestValidator.equals(
    "deleted_at should remain null",
    updatedCategory.deleted_at,
    null,
  );
}
