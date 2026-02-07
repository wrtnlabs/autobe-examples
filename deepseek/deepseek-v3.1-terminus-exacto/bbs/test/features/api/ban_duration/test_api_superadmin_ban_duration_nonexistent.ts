import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanDuration";
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
 * Test the scenario where a super administrator attempts to retrieve a ban duration configuration that does not exist.
 * This validates proper error handling when an invalid UUID is provided for a non-existent record.
 */
export async function test_api_superadmin_ban_duration_nonexistent(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate using the available utility function
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    },
  });
  // Generate a UUID that does not exist in the system
  const nonExistentDurationId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to fetch the non-existent ban duration configuration
  await TestValidator.httpError(
    "non-existent ban duration should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.superAdmin.ban_durations.at(
        superAdminConnection,
        {
          durationId: nonExistentDurationId,
        },
      );
    },
  );
}
