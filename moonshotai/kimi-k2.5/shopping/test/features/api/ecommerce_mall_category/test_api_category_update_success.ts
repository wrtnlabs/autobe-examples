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

/**
 * Test successful category update by an administrator.
 * Validates that an admin can update an existing category's name and description.
 * Creates a category first, then updates it, verifying the correct response.
 */
export async function test_api_category_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create a parent category to be updated
  const originalCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2, wordMax: 3 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parentId: null,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(originalCategory);
  // 3. Prepare update data with new unique name and description
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMax: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IEcommerceMallCategory.IUpdate;
  // 4. Update the category
  const updatedCategory =
    await api.functional.ecommerceMall.admin.categories.update(
      adminConnection,
      {
        categoryId: originalCategory.id,
        body: updateBody,
      },
    );
  typia.assert(updatedCategory);
  // 5. Verify response contains correct updated values
  TestValidator.equals(
    "name matches update",
    updatedCategory.name,
    updateBody.name,
  );
  TestValidator.equals(
    "description matches update",
    updatedCategory.description,
    updateBody.description,
  );
  TestValidator.equals("id unchanged", updatedCategory.id, originalCategory.id);
  TestValidator.equals(
    "parentId unchanged (hierarchical position)",
    updatedCategory.parentId,
    originalCategory.parentId,
  );
  // 6. Verify timestamps are valid
  typia.assertGuard(updatedCategory.createdAt);
  typia.assertGuard(updatedCategory.updatedAt);
  // updatedAt should be different from createdAt after update
  TestValidator.notEquals(
    "updatedAt differs from createdAt",
    updatedCategory.createdAt,
    updatedCategory.updatedAt,
  );
}
