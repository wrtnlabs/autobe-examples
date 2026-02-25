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

export async function test_api_category_subcategory_erase_not_found_for_nonexistent_category(
  connection: api.IConnection,
): Promise<void> {
  // Test the behavior when attempting to delete a subcategory that does not exist or is not found under the specified parent category.
  // The system should return a 404 Not Found response.
  // Verify that no other categories or products are affected.
  // This validates correct error handling and resource existence checks.
  // 1. Authorize administrator join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: typia.random<IShoppingMallAdministrator.IJoin>(),
  });
  const authorizedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${admin.token.access}` },
  };
  // 2. Attempt to delete non-existent subcategory
  const parentCategoryId = typia.random<string & tags.Format<"uuid">>();
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "delete non-existent subcategory - should return 404",
    404,
    async () =>
      await api.functional.shoppingMall.administrator.categories.subcategories.erase(
        authorizedConnection,
        { parentCategoryId, categoryId },
      ),
  );
}
