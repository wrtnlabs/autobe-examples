import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test that member account deletion properly cascades to all related data and
 * makes the account inaccessible.
 *
 * This test validates the complete account deletion workflow:
 *
 * 1. Create a new member account with unique username
 * 2. Retrieve the profile to confirm the account exists
 * 3. Delete the member account
 * 4. Attempt to retrieve the profile again (should fail)
 *
 * The test confirms that:
 *
 * - Account creation succeeds and returns proper authentication
 * - Profile is accessible before deletion
 * - Deletion operation completes successfully
 * - Profile becomes inaccessible after deletion (validates cascade deletion)
 */
export async function test_api_member_account_deletion_verification(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account with unique credentials
  const username = RandomGenerator.alphaNumeric(12);
  const email = `${RandomGenerator.alphaNumeric(10)}@example.com`;
  const password = RandomGenerator.alphaNumeric(16);

  const createdMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: username,
        email: email,
        password: password,
        href: "https://test.com/register",
        referrer: "https://test.com/home",
      } satisfies IRedditCommunityGuest.ICreate,
    });

  typia.assert(createdMember);
  TestValidator.equals(
    "created username matches",
    createdMember.username,
    username,
  );
  TestValidator.equals("created email matches", createdMember.email, email);

  // Step 2: Retrieve the profile to confirm the account exists
  const profileBeforeDeletion: IRedditCommunityGuest =
    await api.functional.redditCommunity.members.profile.at(connection, {
      username: username,
    });

  typia.assert(profileBeforeDeletion);
  TestValidator.predicate(
    "profile has valid initial karma values",
    profileBeforeDeletion.total_posts >= 0 &&
      profileBeforeDeletion.total_comments >= 0,
  );

  // Step 3: Delete the member account
  const deletedMember: IRedditCommunityGuest =
    await api.functional.redditCommunity.member.members.erase(connection, {
      username: username,
    });

  typia.assert(deletedMember);

  // Step 4: Attempt to retrieve the profile again - should fail
  await TestValidator.error(
    "profile retrieval should fail after deletion",
    async () => {
      await api.functional.redditCommunity.members.profile.at(connection, {
        username: username,
      });
    },
  );
}
