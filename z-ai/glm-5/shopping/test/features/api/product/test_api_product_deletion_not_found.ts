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

/**
 * Test that deleting a non-existent product returns 404 Not Found.
 *
 * Administrator attempts to delete a product using a randomly generated UUID
 * that has never been assigned to any product. The system should return a
 * 404 Not Found error, demonstrating proper error handling for non-existent
 * resources.
 */
export async function test_api_product_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Authenticate as administrator
  await authorize_administrator_join(adminConnection, {});
  // 3. Generate a random UUID that doesn't exist in the system
  const nonExistentProductId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to delete non-existent product and expect 404 error
  await TestValidator.httpError(
    "should return 404 when deleting non-existent product",
    404,
    async () =>
      await api.functional.shoppingMall.administrator.products.erase(
        adminConnection,
        {
          productId: nonExistentProductId,
        },
      ),
  );
}
