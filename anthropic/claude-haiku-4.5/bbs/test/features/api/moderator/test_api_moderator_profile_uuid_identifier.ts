import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validate that moderator profile response includes a valid UUID v4 identifier.
 *
 * This test ensures that:
 *
 * 1. A moderator account can be created successfully via the join endpoint
 * 2. The created moderator has a valid UUID v4 identifier in the id field
 * 3. The id field maintains consistent UUID v4 format when retrieving profile
 * 4. Multiple profile retrievals return the same UUID identifier
 *
 * The test creates a moderator account with valid credentials (email, password,
 * username), retrieves the profile, validates the UUID format, and then
 * retrieves the profile again to ensure the identifier is persistent and
 * consistent.
 */
export async function test_api_moderator_profile_uuid_identifier(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    username: RandomGenerator.alphabets(8).toLowerCase(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const createdModerator = await api.functional.auth.moderator.join(
    connection,
    {
      body: moderatorData,
    },
  );
  typia.assert(createdModerator);

  // Step 2: Validate that the created moderator has a valid UUID v4 identifier
  const uuidV4Pattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  TestValidator.predicate(
    "created moderator id is valid UUID v4 format",
    uuidV4Pattern.test(createdModerator.id),
  );

  // Step 3: Retrieve the moderator profile
  const profileFirstRetrieval =
    await api.functional.discussionBoard.moderator.profile.at(connection);
  typia.assert(profileFirstRetrieval);

  // Step 4: Validate that the profile id is a valid UUID v4
  TestValidator.predicate(
    "profile id is valid UUID v4 format",
    uuidV4Pattern.test(profileFirstRetrieval.id),
  );

  // Step 5: Verify that the profile id matches the created moderator id
  TestValidator.equals(
    "profile id matches created moderator id",
    profileFirstRetrieval.id,
    createdModerator.id,
  );

  // Step 6: Retrieve the profile again to ensure UUID consistency
  const profileSecondRetrieval =
    await api.functional.discussionBoard.moderator.profile.at(connection);
  typia.assert(profileSecondRetrieval);

  // Step 7: Verify that the second profile retrieval has the same UUID
  TestValidator.equals(
    "second profile retrieval returns same UUID",
    profileSecondRetrieval.id,
    profileFirstRetrieval.id,
  );

  // Step 8: Verify UUID format consistency across multiple retrievals
  TestValidator.predicate(
    "all profile retrievals have valid UUID v4 format",
    uuidV4Pattern.test(profileSecondRetrieval.id),
  );
}
