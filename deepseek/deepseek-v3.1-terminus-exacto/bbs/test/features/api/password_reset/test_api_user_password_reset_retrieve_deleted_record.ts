import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_password_reset_retrieve_deleted_record(
  connection: api.IConnection,
): Promise<void> {
  // Create a user-specific connection with authentication
  const userConnection: api.IConnection = { host: connection.host };
  // Create a user account using the utility function
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(user);
  // Generate a random UUID that simulates a non-existent or deleted reset record
  const randomResetId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve a password reset record that doesn't exist
  // This tests the system's handling of soft-deleted or non-existent records
  await TestValidator.error(
    "non-existent reset record should return error",
    async () => {
      await api.functional.discussionBoard.user.users.password_resets.at(
        userConnection, // Use authenticated user connection
        { resetId: randomResetId },
      );
    },
  );
}
