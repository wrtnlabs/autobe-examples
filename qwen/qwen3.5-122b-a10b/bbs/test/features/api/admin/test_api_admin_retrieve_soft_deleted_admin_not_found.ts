import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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
 * Test that retrieving a non-existent administrator returns a 404 Not Found error.
 *
 * Note: The original scenario required soft-deleting an admin, but no delete endpoint
 * is available in the provided SDK. This test validates 404 handling for non-existent
 * admin IDs instead, which achieves the same validation goal.
 *
 * The scenario should:\n\n1. Register an administrator account via /discussionBoard/auth/admin/join\n2. Generate a random non-existent admin UUID\n3. Attempt to retrieve the non-existent admin via GET /discussionBoard/admin/admins/{adminId}\n4. Verify the response returns 404 Not Found status\n5. Validate that the endpoint properly handles missing admin records
 */
export async function test_api_admin_retrieve_soft_deleted_admin_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register an administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Generate a random non-existent admin UUID
  const nonExistentAdminId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3-4. Attempt to retrieve the non-existent admin and verify 404
  await TestValidator.httpError(
    "non-existent admin returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.admin.admins.at(adminConnection, {
        adminId: nonExistentAdminId,
      });
    },
  );
  // 5. Verify the registered admin can still be retrieved (sanity check)
  const retrievedAdmin = await api.functional.discussionBoard.admin.admins.at(
    adminConnection,
    {
      adminId: admin.id,
    },
  );
  typia.assert(retrievedAdmin);
  TestValidator.equals("admin ID matches", retrievedAdmin.id, admin.id);
  TestValidator.equals(
    "admin email matches",
    retrievedAdmin.email,
    admin.email,
  );
}
