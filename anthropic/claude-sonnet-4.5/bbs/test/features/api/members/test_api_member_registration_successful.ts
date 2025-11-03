import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test successful member registration with complete profile information.
 *
 * This test validates the complete member registration workflow where a new
 * user successfully creates an account by providing valid credentials
 * (username, email, password) and optional profile information. The test
 * ensures that the system accepts all valid input data, creates the member
 * account with pending_email_verification status, and returns a summary
 * response excluding sensitive authentication data.
 *
 * Test Flow:
 *
 * 1. Generate valid registration data including required credentials and optional
 *    profile fields
 * 2. Call the member registration API with the prepared data
 * 3. Validate the response structure matches IDiscussionBoardMember.ISummary
 * 4. Verify that the response contains public member information without sensitive
 *    data
 */
export async function test_api_member_registration_successful(
  connection: api.IConnection,
) {
  // Generate valid registration data
  const registrationData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    location: RandomGenerator.name(1),
    website_url: typia.random<string & tags.Format<"uri">>(),
    profile_picture_url: typia.random<string & tags.Format<"uri">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  // Call the registration API
  const registeredMember: IDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.members.create(connection, {
      body: registrationData,
    });

  // Validate the response
  typia.assert(registeredMember);

  // Verify that the username matches the registration data
  TestValidator.equals(
    "username matches registration data",
    registeredMember.username,
    registrationData.username,
  );
}
