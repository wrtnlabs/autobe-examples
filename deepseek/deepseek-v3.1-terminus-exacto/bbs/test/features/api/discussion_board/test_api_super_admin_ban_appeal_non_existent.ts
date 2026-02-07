import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
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
 * Test error handling when retrieving a non-existent ban appeal.
 * Attempt to retrieve an appeal with valid but non-existent banId and appealId parameters.
 * Verify the system returns appropriate error responses for non-existent resources.
 */
export async function test_api_super_admin_ban_appeal_non_existent(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Non-existent ban and appeal IDs with valid UUID format
  const nonExistentBanId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentAppealId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError("non-existent ban appeal", 404, async () => {
    await api.functional.discussionBoard.superAdmin.bans.appeals.at(
      superAdminConnection,
      {
        banId: nonExistentBanId,
        appealId: nonExistentAppealId,
      },
    );
  });
  // Test 2: Valid UUID format but non-existent (edge cases)
  const validButNonExistentBanId =
    "00000000-0000-0000-0000-000000000000" satisfies string &
      tags.Format<"uuid"> as string & tags.Format<"uuid">;
  const validButNonExistentAppealId =
    "ffffffff-ffff-ffff-ffff-ffffffffffff" satisfies string &
      tags.Format<"uuid"> as string & tags.Format<"uuid">;
  await TestValidator.httpError(
    "valid UUID but non-existent",
    404,
    async () => {
      await api.functional.discussionBoard.superAdmin.bans.appeals.at(
        superAdminConnection,
        {
          banId: validButNonExistentBanId,
          appealId: validButNonExistentAppealId,
        },
      );
    },
  );
}
