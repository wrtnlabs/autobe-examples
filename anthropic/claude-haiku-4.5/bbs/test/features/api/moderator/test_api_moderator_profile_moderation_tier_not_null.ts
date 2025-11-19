import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

export async function test_api_moderator_profile_moderation_tier_not_null(
  connection: api.IConnection,
) {
  // Create a new moderator account with proper validation
  const email = typia.random<string & tags.Format<"email">>();
  const username =
    RandomGenerator.alphabets(6).toLowerCase() +
    RandomGenerator.alphaNumeric(2);
  const password = "SecureP@ss123";

  const moderatorCreateData = {
    email: email,
    password: password,
    username: username,
  } satisfies IDiscussionBoardModerator.ICreate;

  // Join as a new moderator - this creates the moderator account
  const authorized = await api.functional.auth.moderator.join(connection, {
    body: moderatorCreateData,
  });
  typia.assert(authorized);

  // Verify the moderator has moderation_tier set to 'full' from join response
  TestValidator.equals(
    "moderator from join should have moderation_tier set to full",
    authorized.moderation_tier,
    "full",
  );

  // Retrieve the authenticated moderator's profile
  const profile: IDiscussionBoardUser =
    await api.functional.discussionBoard.moderator.profile.at(connection);
  typia.assert(profile);

  // Verify the moderationTier field is not null in the profile response
  TestValidator.predicate(
    "moderator profile moderationTier should not be null or undefined",
    profile.moderationTier !== null && profile.moderationTier !== undefined,
  );

  // Verify the moderationTier is a string with content
  TestValidator.predicate(
    "moderator profile moderationTier should be a non-empty string",
    typeof profile.moderationTier === "string" &&
      profile.moderationTier.length > 0,
  );
}
