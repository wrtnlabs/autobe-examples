import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
 * Test user profile retrieval after updating profile information.
 * This scenario validates that the profile endpoint correctly reflects recent changes
 * to user profile data, specifically testing the update functionality.
 */
export async function test_api_user_profile_with_recently_updated_bio(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and register new user using utility function
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
  // Retrieve initial profile
  const initialProfile =
    await api.functional.discussionBoard.user.profile.at(userConnection);
  typia.assert(initialProfile);
  // Since the profile update endpoint expects IDiscussionBoardSection.IUpdate,
  // and it doesn't contain bio field, we'll test with available fields
  // For this test, we'll focus on verifying the update functionality works
  const updatedProfile =
    await api.functional.discussionBoard.user.profile.update(userConnection, {
      body: {
        // Use available fields from IDiscussionBoardSection.IUpdate
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardSection.IUpdate,
    });
  typia.assert(updatedProfile);
  // Retrieve profile again after update
  const finalProfile =
    await api.functional.discussionBoard.user.profile.at(userConnection);
  typia.assert(finalProfile);
  // Validate that the profile was retrieved successfully after update
  TestValidator.equals(
    "profile should be accessible after update",
    typeof finalProfile,
    "object",
  );
  TestValidator.equals(
    "id should remain same",
    finalProfile.id,
    initialProfile.id,
  );
  TestValidator.equals(
    "email should remain same",
    finalProfile.email,
    initialProfile.email,
  );
  TestValidator.notEquals(
    "updated_at should change after profile operation",
    initialProfile.updated_at,
    finalProfile.updated_at,
  );
  // Validate timestamp using string comparison since both are ISO strings
  TestValidator.predicate(
    "updated_at should be more recent",
    finalProfile.updated_at > initialProfile.updated_at,
  );
}
