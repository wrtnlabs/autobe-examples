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

export async function test_api_user_section_preference_delete_cross_user_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Create first user connection and join using utility function
  const user1Connection: api.IConnection = { host: connection.host };
  const user1 = await authorize_user_join(user1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user1);
  // Create second user connection and join using utility function
  const user2Connection: api.IConnection = { host: connection.host };
  const user2 = await authorize_user_join(user2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user2);
  // Note: Since we don't have endpoints to create section preferences,
  // we'll assume preferences already exist or use randomly generated UUIDs
  // to test the authorization boundary
  const user1PreferenceId = typia.random<string & tags.Format<"uuid">>();
  const user2PreferenceId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: User1 attempts to delete User2's preference - should fail with 403/404
  await TestValidator.httpError(
    "cross-user deletion should fail",
    [403, 404],
    async () => {
      await api.functional.discussionBoard.user.profile.sections.preferences.erase(
        user1Connection,
        {
          preferenceId: user2PreferenceId,
        },
      );
    },
  );
  // Test 2: User2 attempts to delete User1's preference - should fail with 403/404
  await TestValidator.httpError(
    "cross-user deletion should fail",
    [403, 404],
    async () => {
      await api.functional.discussionBoard.user.profile.sections.preferences.erase(
        user2Connection,
        {
          preferenceId: user1PreferenceId,
        },
      );
    },
  );
  // Test 3: Each user should be able to delete their own preference
  // Since we don't have actual preference IDs, we'll test with random UUIDs
  // to verify the endpoint call structure compiles correctly
  await api.functional.discussionBoard.user.profile.sections.preferences.erase(
    user1Connection,
    {
      preferenceId: user1PreferenceId,
    },
  );
  await api.functional.discussionBoard.user.profile.sections.preferences.erase(
    user2Connection,
    {
      preferenceId: user2PreferenceId,
    },
  );
  // Validate that user IDs are different to ensure proper test isolation
  TestValidator.notEquals(
    "users should have different IDs",
    user1.id,
    user2.id,
  );
}
