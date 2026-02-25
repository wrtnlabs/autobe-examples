import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionPreference";
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
 * Test retrieving a non-existent section preference with valid UUID format.
 *
 * This test validates that the system properly handles requests for section preferences
 * that do not exist in the database but have valid UUID format. It ensures the API
 * returns an appropriate error response (404 Not Found) when attempting to access
 * a preference record that doesn't belong to the authenticated user.
 */
export async function test_api_user_profile_sections_preferences_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate via join
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(authorizedUser);
  // Generate a valid UUID that doesn't correspond to any existing preference
  const nonExistentPreferenceId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the non-existent preference and validate 404 error
  await TestValidator.httpError(
    "retrieving non-existent preference",
    404,
    async () => {
      await api.functional.discussionBoard.user.profile.sections.preferences.at(
        userConnection,
        {
          preferenceId: nonExistentPreferenceId,
        },
      );
    },
  );
}
