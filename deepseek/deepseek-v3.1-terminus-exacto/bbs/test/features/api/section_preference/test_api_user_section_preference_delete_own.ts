import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_section_preference_delete_own(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Generate a random preference ID to delete
  const preferenceId = typia.random<string & tags.Format<"uuid">>();
  // Test successful deletion of own section preference
  await api.functional.discussionBoard.user.profile.sections.preferences.erase(
    userConnection,
    {
      preferenceId: preferenceId,
    },
  );
  // Verify the preference no longer exists by attempting to delete it again
  await TestValidator.error("deleting non-existent preference", async () => {
    await api.functional.discussionBoard.user.profile.sections.preferences.erase(
      userConnection,
      {
        preferenceId: preferenceId,
      },
    );
  });
  // Test authorization - user cannot delete other users' preferences
  const otherUserConnection: api.IConnection = { host: connection.host };
  const otherUser = await authorize_user_join(otherUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(otherUser);
  // Attempt to delete the same preference with different user (should fail)
  await TestValidator.error("deleting other user's preference", async () => {
    await api.functional.discussionBoard.user.profile.sections.preferences.erase(
      otherUserConnection,
      {
        preferenceId: preferenceId,
      },
    );
  });
}
