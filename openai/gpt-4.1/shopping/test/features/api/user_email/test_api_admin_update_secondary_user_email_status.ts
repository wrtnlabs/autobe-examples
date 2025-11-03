import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingUserEmail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingUserEmail";

/**
 * Test admin update of secondary user email status: negative test for
 * non-existent ID.
 *
 * There is no API to create or list user email records; only admin join and
 * admin userEmails.update are available. Therefore, only the rejection of
 * updates for non-existing user email records can be validated.
 *
 * Steps:
 *
 * 1. Register an admin for authentication.
 * 2. Attempt to update a (random) non-existent user email record; expect failure
 *    (error thrown).
 */
export async function test_api_admin_update_secondary_user_email_status(
  connection: api.IConnection,
) {
  // 1. Register an admin for authentication
  const adminEmail = RandomGenerator.name(1) + "@company.com";
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        role: "super",
        status: "active",
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Attempt to update a non-existent user email record
  await TestValidator.error(
    "should fail to update non-existent user email record",
    async () => {
      await api.functional.shopping.admin.userEmails.update(connection, {
        userEmailId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          is_verified: true,
        } satisfies IShoppingUserEmail.IUpdate,
      });
    },
  );
}
