import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test error handling when retrieving a non-existent administrator profile.
 *
 * This test validates that the system properly handles requests for
 * administrator profiles that do not exist in the database, returning
 * appropriate 404 Not Found responses.
 */
export async function test_api_admin_retrieve_nonexistent_profile(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Generate a non-existent admin ID (valid UUID format but not in database)
  const nonExistentAdminId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve non-existent administrator profile
  await TestValidator.httpError(
    "should return 404 for non-existent admin",
    404,
    async () =>
      await api.functional.shoppingMall.admin.admins.at(adminConnection, {
        adminId: nonExistentAdminId,
      }),
  );
}
