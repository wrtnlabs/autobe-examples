import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_category_subcategory_erase_forbidden_for_non_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: A user without administrator authorization attempts to delete a subcategory under a given parent category.
  // Expected result: The API call should be forbidden with a 403 error, and no deletion should occur.
  // 1. Administrator join to prepare an authorized admin account (for setup only, not used for deletion)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongPass123",
    },
  });
  typia.assert(adminAuthorized);
  // 2. Use the base connection (non-authorized user) to attempt to delete a subcategory.
  // Random UUIDs to represent parentCategoryId and categoryId (subcategory ID)
  const parentCategoryId = typia.random<string & tags.Format<"uuid">>();
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt deletion expecting forbidden error
  await TestValidator.httpError(
    "forbidden: non-administrator cannot delete subcategory",
    403,
    async () => {
      await api.functional.shoppingMall.administrator.categories.subcategories.erase(
        connection,
        {
          parentCategoryId,
          categoryId,
        },
      );
    },
  );
}
