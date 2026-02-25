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

/**
 * Test user attempting to delete a non-existent section preference.
 *
 * This test validates that the system properly handles requests to delete
 * section preferences that don't exist. It creates an authenticated user,
 * generates a random UUID that doesn't correspond to any existing preference,
 * and attempts to delete it, expecting a not-found error response.
 */
export async function test_api_user_section_preference_delete_nonexistent(
  connection: api.IConnection,
): Promise<void> {
  // Create user authentication connection
  const userConnection: api.IConnection = { host: connection.host };
  // Register and authenticate user
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Generate a random UUID that doesn't correspond to any existing preference
  const nonExistentPreferenceId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to delete the non-existent preference and validate error response
  await TestValidator.error(
    "delete non-existent section preference",
    async () => {
      await api.functional.discussionBoard.user.profile.sections.preferences.erase(
        userConnection,
        {
          preferenceId: nonExistentPreferenceId,
        },
      );
    },
  );
}
