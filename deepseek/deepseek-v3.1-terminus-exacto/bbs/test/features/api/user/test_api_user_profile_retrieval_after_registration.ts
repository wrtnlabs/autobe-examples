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
 * Test the successful retrieval of a user's profile immediately after account registration.
 * This scenario validates that the profile endpoint correctly returns all user information
 * including display name, email, bio, and timestamps.
 */
export async function test_api_user_profile_retrieval_after_registration(
  connection: api.IConnection,
): Promise<void> {
  // Create a new user account using the utility function
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(authorizedUser);
  // Retrieve the user profile using the authenticated connection
  const profile =
    await api.functional.discussionBoard.user.profile.at(userConnection);
  typia.assert(profile);
  // Validate that all profile fields match the registration data
  TestValidator.equals("user ID matches", profile.id, authorizedUser.id);
  TestValidator.equals("email matches", profile.email, authorizedUser.email);
  TestValidator.equals(
    "display name matches",
    profile.display_name,
    authorizedUser.display_name,
  );
  TestValidator.equals("bio matches", profile.bio, authorizedUser.bio);
  // Validate timestamp fields are properly set
  TestValidator.predicate(
    "created_at is valid date",
    () => !isNaN(new Date(profile.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    () => !isNaN(new Date(profile.updated_at).getTime()),
  );
  TestValidator.predicate(
    "deleted_at is null",
    () => profile.deleted_at === null,
  );
  // Test scenario with null bio to ensure optional field handling
  const userConnection2: api.IConnection = { host: connection.host };
  const authorizedUser2 = await authorize_user_join(userConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: null,
    },
  });
  typia.assert(authorizedUser2);
  const profile2 =
    await api.functional.discussionBoard.user.profile.at(userConnection2);
  typia.assert(profile2);
  TestValidator.equals("null bio is preserved", profile2.bio, null);
}
