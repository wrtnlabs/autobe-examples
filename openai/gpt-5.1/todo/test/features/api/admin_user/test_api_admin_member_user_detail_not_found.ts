import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";

/**
 * Validate that an authenticated adminUser receives an error when requesting
 * details of a non-existent member user.
 *
 * Business goal: Ensure that the member user detail endpoint does not
 * mistakenly succeed for arbitrary UUIDs and that the system differentiates
 * between a valid admin context and a missing member resource. The error must
 * be about the missing member user, not about authentication.
 *
 * Steps:
 *
 * 1. Register a fresh adminUser using POST /auth/adminUser/join.
 * 2. Generate a random UUID that is not associated with any member user in this
 *    test.
 * 3. As the authenticated adminUser, call GET
 *    /todoApp/adminUser/memberUsers/{memberUserId} with the random UUID.
 * 4. Confirm that the call fails (throws) for the missing resource while the
 *    adminUser context remains valid.
 */
export async function test_api_admin_member_user_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Register a fresh adminUser (authentication setup)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminUser: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminUser);

  // 2. Generate a random UUID for a non-existent member user
  const missingMemberUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3 & 4. As authenticated adminUser, request details for the non-existent
  // member user and ensure an error is raised.
  await TestValidator.error(
    "non-existent member user detail should produce an error",
    async () => {
      await api.functional.todoApp.adminUser.memberUsers.at(connection, {
        memberUserId: missingMemberUserId,
      });
    },
  );
}
