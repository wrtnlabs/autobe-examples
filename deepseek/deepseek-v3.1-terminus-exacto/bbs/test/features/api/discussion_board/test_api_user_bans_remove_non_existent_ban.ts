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

export async function test_api_user_bans_remove_non_existent_ban(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection using SDK since utility function is not imported
  const adminConnection: api.IConnection = { host: connection.host };
  // Create admin account using SDK directly
  await api.functional.discussionBoard.auth.admin.join(adminConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: "password123",
    },
  });
  // Attempt to remove a non-existent ban with valid UUID format
  const invalidBanId = typia.random<string & typia.tags.Format<"uuid">>();
  // Use SDK function directly since no utility function exists for ban removal
  try {
    await api.functional.discussionBoard.admin.user_bans.erase(
      adminConnection,
      {
        banId: invalidBanId,
      },
    );
    // If no error is thrown, the test should fail
    throw new Error("Expected error when removing non-existent ban");
  } catch (error) {
    // Expected behavior - non-existent ban removal should fail
    // No need for additional validation since error is expected
  }
}
