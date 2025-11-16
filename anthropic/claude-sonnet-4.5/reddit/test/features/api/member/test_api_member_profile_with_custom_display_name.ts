import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test retrieving a member profile with a custom display_name.
 *
 * This test validates the retrieval of a member profile with a custom
 * display_name configured. The test creates a new member account with a custom
 * display_name different from the username, then retrieves the member profile
 * by username to verify that both the username and the custom display_name are
 * correctly returned in the public profile response. This ensures the platform
 * properly supports personalized display names while maintaining unique
 * username identifiers for member identification and profile access.
 *
 * Steps:
 *
 * 1. Create a new member account with a custom display_name during registration
 * 2. Retrieve the member profile using the username
 * 3. Validate that the profile contains both the username and the custom
 *    display_name
 * 4. Verify that the display_name matches the value provided during registration
 */
export async function test_api_member_profile_with_custom_display_name(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account with custom display_name
  const username = RandomGenerator.alphaNumeric(12);
  const customDisplayName = RandomGenerator.name(2);
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const memberData = {
    username: username,
    email: email,
    password: password,
    display_name: customDisplayName,
    href: href,
    referrer: referrer,
  } satisfies IRedditCommunityGuest.ICreate;

  const createdMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(createdMember);

  // Validate created member has the custom display_name
  TestValidator.equals(
    "created member username matches",
    createdMember.username,
    username,
  );
  TestValidator.equals(
    "created member display_name matches",
    createdMember.display_name,
    customDisplayName,
  );

  // Step 2: Retrieve the member profile by username
  const retrievedProfile: IRedditCommunityGuest.ISummary =
    await api.functional.redditCommunity.members.at(connection, {
      username: username,
    });
  typia.assert(retrievedProfile);

  // Step 3: Validate that the profile contains both username and custom display_name
  TestValidator.equals(
    "retrieved profile username matches",
    retrievedProfile.username,
    username,
  );
  TestValidator.equals(
    "retrieved profile display_name matches",
    retrievedProfile.display_name,
    customDisplayName,
  );

  // Step 4: Verify that the display_name is different from username to confirm customization
  TestValidator.notEquals(
    "display_name differs from username",
    retrievedProfile.display_name,
    retrievedProfile.username,
  );
}
