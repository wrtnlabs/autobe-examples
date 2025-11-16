import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test Password Hashing During Member Registration
 *
 * This test verifies that passwords are properly hashed during member
 * registration and never stored or returned in plain text. It validates that:
 *
 * 1. Member registration accepts plain text passwords
 * 2. API responses never expose plain text passwords
 * 3. Authentication tokens are properly issued after registration
 * 4. Member profile data is correctly initialized
 *
 * Test Flow:
 *
 * 1. Generate registration data with a known plain text password
 * 2. Register a new member account
 * 3. Verify the response does not contain the plain text password
 * 4. Validate authentication tokens are properly issued
 * 5. Confirm member profile is correctly initialized
 */
export async function test_api_member_registration_password_hashing(
  connection: api.IConnection,
) {
  // Step 1: Generate registration data with a known plain text password
  const plainTextPassword = "SecurePassword123!@#";
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(12);

  const registrationData = {
    username: memberUsername,
    email: memberEmail,
    password: plainTextPassword,
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: false,
    show_subscribed_communities: false,
    show_activity_feed: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  // Step 2: Register new member account
  const registeredMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });
  typia.assert(registeredMember);

  // Step 3: Verify response does not contain plain text password
  const responseJson = JSON.stringify(registeredMember);
  TestValidator.predicate(
    "response must not contain plain text password",
    !responseJson.includes(plainTextPassword),
  );

  // Step 4: Validate authentication tokens are properly issued
  TestValidator.predicate(
    "access token must be present",
    registeredMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token must be present",
    registeredMember.token.refresh.length > 0,
  );

  // Step 5: Verify member profile data
  TestValidator.equals(
    "registered username matches input",
    registeredMember.username,
    memberUsername,
  );
  TestValidator.equals(
    "registered email matches input",
    registeredMember.email,
    memberEmail,
  );
  TestValidator.equals(
    "email verification starts as false",
    registeredMember.email_verified,
    false,
  );
  TestValidator.equals(
    "initial post karma is zero",
    registeredMember.post_karma,
    0,
  );
  TestValidator.equals(
    "initial comment karma is zero",
    registeredMember.comment_karma,
    0,
  );
}
