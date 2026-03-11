import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test error handling when attempting to remove a ban that does not exist.
 * Scenario: 1) Authenticate as super admin 2) Generate a random/invalid ban UUID
 * 3) Attempt to remove the non-existent ban using DELETE endpoint 4) Verify the
 * system returns appropriate error response (likely 404 with clear error message
 * indicating ban not found). Business logic: System should validate ban existence
 * and return meaningful error for invalid IDs to prevent confusion and maintain security.
 */
export async function test_api_user_bans_remove_non_existent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Generate random/invalid ban UUID
  const invalidBanId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to remove non-existent ban and verify error
  await TestValidator.error("remove non-existent ban", async () => {
    await api.functional.discussionBoard.superAdmin.user_bans.erase(
      superAdminConnection,
      {
        banId: invalidBanId,
      },
    );
  });
}
