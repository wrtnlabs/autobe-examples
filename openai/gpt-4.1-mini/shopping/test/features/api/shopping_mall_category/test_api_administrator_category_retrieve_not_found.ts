import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test retrieving a product category by a logged-in administrator using a categoryId that does not exist.
 * Expect the system to return a 404 Not Found error status.
 * This verifies proper handling of invalid UUIDs for categoryId and ensures non-existent resources are handled gracefully.
 * Confirm that the administrator must be authenticated prior to making the request.
 */
export async function test_api_administrator_category_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {});
  typia.assert(admin);
  // 2. Attempt to retrieve a non-existent category by using a random UUID
  const nonExistentCategoryId = typia.random<string & tags.Format<"uuid">>();
  // 3. Expect a 404 Not Found error when retrieving the category
  await TestValidator.httpError(
    "retrieving non-existent category returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.categories.at(
        adminConnection,
        {
          categoryId: nonExistentCategoryId,
        },
      );
    },
  );
}
