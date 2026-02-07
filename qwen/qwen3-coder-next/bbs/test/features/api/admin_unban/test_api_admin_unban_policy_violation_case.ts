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

export async function test_api_admin_unban_policy_violation_case(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Use utility function to login as admin
  await authorize_admin_join(adminConnection, {
    body: {} satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Generate a ban record ID for testing
  const banRecordId = typia.random<string & tags.Format<"uuid">>();
  // Delete the ban record to unban the user
  await api.functional.discussionBoard.admin.admins.bans.erase(
    adminConnection,
    {
      banRecordId: banRecordId,
    },
  );
  // Verify the operation completed successfully (no exception thrown)
  // The test succeeds if no error is thrown during ban record deletion
}
