import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";

/**
 * Validate that admin user detail retrieval is restricted to authenticated
 * admins.
 *
 * Business goals:
 *
 * - Unauthenticated callers must not be able to read admin user details.
 * - Authenticated member users (non-admin) must also be rejected.
 * - Authenticated admin users must be able to fetch their own account detail
 *   record from todo_app_adminusers via the admin detail endpoint.
 *
 * Steps:
 *
 * 1. Prepare a dummy adminUserId UUID.
 * 2. Using an unauthenticated connection, call GET
 *    /todoApp/adminUser/adminUsers/{adminUserId} and expect an error.
 * 3. Register a member user via POST /auth/memberUser/join which also issues a
 *    member token into the shared connection headers.
 * 4. With member authentication active, call the admin detail endpoint again and
 *    still expect an error.
 * 5. Register an admin user via POST /auth/adminUser/join, which overwrites the
 *    connection headers with an admin access token.
 * 6. With admin auth active, call the admin detail endpoint targeting the created
 *    admin id and expect success with a valid ITodoAppAdminUser.
 */
export async function test_api_admin_user_detail_requires_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Prepare a dummy adminUserId UUID for unauthorized access attempts
  const dummyAdminId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Unauthenticated access must fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated access to admin detail must fail",
    async () => {
      await api.functional.todoApp.adminUser.adminUsers.at(unauthConn, {
        adminUserId: dummyAdminId,
      });
    },
  );

  // 3. Register a member user, making the original connection a member context
  const memberJoinBody = typia.random<ITodoAppMemberUserJoin.IRequest>();

  const memberAuthorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ITodoAppMemberuser.IAuthorized>(memberAuthorized);

  // 4. Member-authenticated access must also fail
  await TestValidator.error(
    "member user access to admin detail must fail",
    async () => {
      await api.functional.todoApp.adminUser.adminUsers.at(connection, {
        adminUserId: dummyAdminId,
      });
    },
  );

  // 5. Register an admin user, which overwrites the Authorization header
  const adminJoinBody = typia.random<ITodoAppAdminUser.IJoin>();

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminAuthorized);

  // 6. Admin-authenticated access to own detail must succeed
  const adminDetail: ITodoAppAdminUser =
    await api.functional.todoApp.adminUser.adminUsers.at(connection, {
      adminUserId: adminAuthorized.id,
    });
  typia.assert<ITodoAppAdminUser>(adminDetail);

  // Business validations on successful admin self-detail fetch
  TestValidator.equals(
    "admin detail id must match authorized admin id",
    adminDetail.id,
    adminAuthorized.id,
  );
  TestValidator.equals(
    "admin detail email must match authorized admin email",
    adminDetail.email,
    adminAuthorized.email,
  );
}
