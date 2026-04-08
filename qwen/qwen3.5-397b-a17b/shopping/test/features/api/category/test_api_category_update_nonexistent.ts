import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test category update rejection when targeting non-existent category.
 *
 * Validates that the system properly rejects update attempts for categories that do not exist. This test ensures the API enforces existence validation before allowing category modifications, returning a 404 Not Found error when the target category cannot be located.
 *
 * The test authenticates as an administrator, generates a random UUID that does not correspond to any existing category record, and attempts to update it. The expected behavior is a 404 error response indicating the category was not found.
 *
 * 1. Administrator authenticates via join endpoint with random credentials.
 * 2. Generate a random UUID format string for non-existent category ID.
 * 3. Attempt to update the non-existent category with valid update data.
 * 4. Validate the system rejects with 404 Not Found error.
 */
export async function test_api_category_update_nonexistent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Generate non-existent category ID (random UUID)
  const nonExistentCategoryId = typia.random<string & tags.Format<"uuid">>();
  // 3. Prepare valid update data
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IShoppingMallCategory.IUpdate;
  // 4. Attempt update and validate 404 error
  await TestValidator.httpError(
    "non-existent category update returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.admin.categories.update(
        adminConnection,
        {
          categoryId: nonExistentCategoryId,
          body: updateBody,
        },
      );
    },
  );
}
