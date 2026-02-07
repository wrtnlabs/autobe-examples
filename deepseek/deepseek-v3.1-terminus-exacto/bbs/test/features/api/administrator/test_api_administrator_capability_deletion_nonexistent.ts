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
 * Test deletion attempt for a non-existent capability assignment.
 * A super administrator authenticates and attempts to delete a capability that doesn't exist.
 * Validate that the system returns an appropriate error response indicating the capability assignment cannot be found.
 */
export async function test_api_administrator_capability_deletion_nonexistent(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator using utility function
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Generate random UUIDs that don't exist in the system
  const administratorId = typia.random<string & tags.Format<"uuid">>();
  const capabilityId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to delete non-existent capability and validate error
  await TestValidator.error(
    "non-existent capability deletion should fail",
    async () => {
      await api.functional.discussionBoard.superAdmin.administrators.capabilities.erase(
        superAdminConnection,
        {
          administratorId,
          capabilityId,
        },
      );
    },
  );
}
