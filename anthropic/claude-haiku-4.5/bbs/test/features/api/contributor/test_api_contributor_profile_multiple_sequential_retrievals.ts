import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test that profile data remains consistent across multiple sequential
 * retrieval operations.
 *
 * This test validates that a contributor's profile data is stable and
 * consistent when retrieved multiple times in succession without any
 * modifications. It verifies that the API maintains data consistency by
 * ensuring all profile responses are identical.
 *
 * Test workflow:
 *
 * 1. Register a new contributor account with email, username, password, and
 *    session context
 * 2. Retrieve the contributor's profile for the first time
 * 3. Perform 4 additional sequential profile retrievals
 * 4. Validate that all 5 profile responses are identical to ensure data
 *    consistency
 * 5. Verify no unexpected changes occur during sequential retrieval operations
 */
export async function test_api_contributor_profile_multiple_sequential_retrievals(
  connection: api.IConnection,
) {
  // Step 1: Create contributor account
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<50> &
        tags.Pattern<"^[a-zA-Z0-9_]+$">
    >(),
    password: RandomGenerator.alphabets(10) + "Aa1!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardContributor.ICreate;

  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: createBody,
    });
  typia.assert(contributor);

  // Step 2: Retrieve profile for the first time
  const firstProfile: IDiscussionBoardUser =
    await api.functional.discussionBoard.contributor.profile.at(connection);
  typia.assert(firstProfile);

  // Step 3-4: Perform 4 additional sequential retrievals and validate consistency
  const profiles: IDiscussionBoardUser[] = [firstProfile];

  for (let i = 0; i < 4; i++) {
    const profile: IDiscussionBoardUser =
      await api.functional.discussionBoard.contributor.profile.at(connection);
    typia.assert(profile);
    profiles.push(profile);
  }

  // Step 5: Validate all profiles are identical
  for (let i = 1; i < profiles.length; i++) {
    TestValidator.equals(
      `profile retrieval ${i + 1} should match first retrieval`,
      profiles[i],
      firstProfile,
    );
  }

  // Additional validation: Verify profile contains expected contributor data
  TestValidator.equals(
    "profile email matches registered email",
    firstProfile.email,
    createBody.email,
  );

  TestValidator.equals(
    "profile username matches registered username",
    firstProfile.username,
    createBody.username,
  );

  TestValidator.predicate(
    "profile should have active account status",
    firstProfile.accountStatus === "active",
  );

  TestValidator.predicate(
    "profile should have email unverified initially",
    firstProfile.emailVerified === false,
  );
}
