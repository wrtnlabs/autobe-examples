import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

export async function test_api_moderator_profile_retrieval_after_registration(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account
  // This creates a moderator with email, username, and password
  const email = typia.random<string & tags.Format<"email">>();
  const username = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const password = "SecurePass123!";

  const joinResponse: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email,
        username,
        password,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(joinResponse);

  // Verify the join response contains the moderator's basic information
  TestValidator.equals(
    "moderator email matches registration input",
    joinResponse.email,
    email,
  );
  TestValidator.equals(
    "moderator username matches registration input",
    joinResponse.username,
    username,
  );
  TestValidator.equals(
    "moderator account status is active",
    joinResponse.account_status,
    "active",
  );
  TestValidator.equals(
    "moderator has full moderation tier",
    joinResponse.moderation_tier,
    "full",
  );
  TestValidator.equals(
    "moderator email is not verified initially",
    joinResponse.email_verified,
    false,
  );

  // Step 2: Retrieve the moderator's profile using the authenticated connection
  // The join response automatically sets the Authorization header with the access token
  const profileResponse: IDiscussionBoardUser =
    await api.functional.discussionBoard.moderator.profile.at(connection);
  typia.assert(profileResponse);

  // Step 3: Verify the profile response contains all required fields
  // Validate that profile data matches the registered moderator information
  TestValidator.equals(
    "profile email matches registered email",
    profileResponse.email,
    email,
  );
  TestValidator.equals(
    "profile username matches registered username",
    profileResponse.username,
    username,
  );
  TestValidator.equals(
    "profile account status is active",
    profileResponse.accountStatus,
    "active",
  );
  TestValidator.equals(
    "profile email verified is false initially",
    profileResponse.emailVerified,
    false,
  );

  // Step 4: Verify moderator-specific fields in profile
  TestValidator.equals(
    "profile moderationTier is full",
    profileResponse.moderationTier,
    "full",
  );

  // Step 5: Verify consistency between join response and profile response
  TestValidator.equals(
    "profile ID matches join response ID",
    profileResponse.id,
    joinResponse.id,
  );
  TestValidator.equals(
    "profile creation timestamp matches join response timestamp",
    profileResponse.createdAt,
    joinResponse.created_at,
  );
}
