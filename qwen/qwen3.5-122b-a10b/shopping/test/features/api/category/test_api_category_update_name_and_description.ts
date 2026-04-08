import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator can update category name and description.
 *
 * Validates the category update workflow for administrators, ensuring that category attributes can be modified through the update endpoint. The test covers authentication, update request with new name and description values, and verification of the updated entity response.
 *
 * Note: This test uses a randomly generated category ID since the category creation API is not available in the current SDK. The test validates that the update function properly accepts parameters and returns a correctly structured category entity.
 *
 * 1. Administrator authenticates via join endpoint.
 * 2. Prepares update request with new name and description values.
 * 3. Calls the category update endpoint with a category ID.
 * 4. Validates the response contains all required category fields.
 * 5. Verifies the response structure matches IEcommerceCategory type.
 */
export async function test_api_category_update_name_and_description(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Prepare update request with new name and description
  const newName = RandomGenerator.name(3);
  const newDescription = RandomGenerator.paragraph({ sentences: 5 });
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // 3. Update the category with new name and description
  const updatedCategory =
    await api.functional.ecommerce.admin.categories.update(adminConnection, {
      categoryId: categoryId,
      body: {
        name: newName,
        description: newDescription,
      } satisfies IEcommerceCategory.IUpdate,
    });
  typia.assert(updatedCategory);
  // 4. Verify the response contains the updated category with all fields
  TestValidator.equals(
    "category name matches input",
    updatedCategory.name,
    newName,
  );
  TestValidator.equals(
    "category description matches input",
    updatedCategory.description,
    newDescription,
  );
  TestValidator.predicate(
    "category has valid ID",
    updatedCategory.id !== undefined,
  );
  TestValidator.predicate(
    "category has created_at timestamp",
    updatedCategory.created_at !== undefined,
  );
  TestValidator.predicate(
    "category has updated_at timestamp",
    updatedCategory.updated_at !== undefined,
  );
  TestValidator.predicate(
    "category has parent field",
    updatedCategory.parent !== undefined,
  );
  TestValidator.predicate(
    "category has subcategories field",
    Array.isArray(updatedCategory.subcategories),
  );
}
