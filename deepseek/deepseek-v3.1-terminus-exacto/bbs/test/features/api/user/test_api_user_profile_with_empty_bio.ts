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
 * Test profile retrieval when the user has an empty biography field.
 * This scenario validates that the profile endpoint correctly handles optional fields that may be null.
 * The test should verify that the bio field returns as null when not set, and that all other profile information remains intact.
 * This ensures that optional profile fields are properly handled in the response.
 */
export async function test_api_user_profile_with_empty_bio(
  connection: api.IConnection,
): Promise<void> {
  // Create a new user account with empty bio
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: null,
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(authorizedUser);
  // Retrieve the user profile
  const profile =
    await api.functional.discussionBoard.user.profile.at(userConnection);
  typia.assert(profile);
  // Validate that bio is null as expected
  TestValidator.equals("bio should be null", profile.bio, null);
  // Validate that other profile fields match the created user data
  TestValidator.equals(
    "email should match",
    profile.email,
    authorizedUser.email,
  );
  TestValidator.equals(
    "display_name should match",
    profile.display_name,
    authorizedUser.display_name,
  );
  // Note: typia.assert() above already validates UUID format, date-time formats, and all other type constraints
  // No need for additional validation checks as typia.assert() provides complete runtime type validation
}
