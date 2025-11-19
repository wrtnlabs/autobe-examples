import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

export async function test_api_contributor_profile_username_immutability(
  connection: api.IConnection,
) {
  // Step 1: Register a new contributor with a specific username
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphabets(10);
  const password = "TestPass123!";
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const registered = await api.functional.auth.contributor.join(connection, {
    body: {
      email,
      username,
      password,
      href,
      referrer,
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(registered);

  // Validate that username was set correctly at registration
  TestValidator.equals(
    "registered username matches input username",
    registered.username,
    username,
  );

  // Step 2: Retrieve profile for the first time
  const profileFirst =
    await api.functional.discussionBoard.contributor.profile.at(connection);
  typia.assert(profileFirst);

  // Validate that profile username matches registration username
  TestValidator.equals(
    "first profile retrieval username matches registered username",
    profileFirst.username,
    username,
  );

  // Step 3: Retrieve profile multiple times to ensure consistency
  const profileSecond =
    await api.functional.discussionBoard.contributor.profile.at(connection);
  typia.assert(profileSecond);

  TestValidator.equals(
    "second profile retrieval username matches registered username",
    profileSecond.username,
    username,
  );

  // Step 4: Verify username consistency across multiple retrievals
  TestValidator.equals(
    "username remains consistent across multiple profile retrievals",
    profileFirst.username,
    profileSecond.username,
  );

  // Step 5: Retrieve one more time to ensure immutability
  const profileThird =
    await api.functional.discussionBoard.contributor.profile.at(connection);
  typia.assert(profileThird);

  TestValidator.equals(
    "third profile retrieval username matches initial username",
    profileThird.username,
    username,
  );

  // Step 6: Final validation - all profile retrievals have identical usernames
  TestValidator.equals(
    "all profile retrievals contain identical immutable username",
    profileFirst.username,
    profileThird.username,
  );
}
