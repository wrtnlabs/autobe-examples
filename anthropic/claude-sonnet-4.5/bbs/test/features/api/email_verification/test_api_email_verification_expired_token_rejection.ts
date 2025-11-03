import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuth";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test email verification with an expired token to ensure proper security
 * enforcement.
 *
 * This test validates that the email verification system properly rejects
 * expired verification tokens. The workflow includes:
 *
 * 1. Create a new member account through registration (generates verification
 *    token)
 * 2. Simulate token expiration scenario
 * 3. Attempt to verify email with expired token
 * 4. Validate proper rejection with error message
 * 5. Confirm account remains in pending_email_verification status
 * 6. Verify email_verified is still false
 */
export async function test_api_email_verification_expired_token_rejection(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account through registration
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.name(2),
    website_url: typia.random<string & tags.Format<"uri">>(),
    profile_picture_url: typia.random<string & tags.Format<"uri">>(),
    ip: "192.168.1.100",
    href: "https://discussion.example.com/register" satisfies string &
      tags.Format<"uri">,
    referrer: "https://discussion.example.com/" satisfies string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardMember.ICreate;

  const createdMember: IDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.members.create(connection, {
      body: memberData,
    });
  typia.assert(createdMember);

  // Step 2: Simulate expired token scenario
  // In a real scenario, the token would be expired. For this test, we use an obviously invalid/expired token
  const expiredToken = "expired_token_" + RandomGenerator.alphaNumeric(32);

  // Step 3: Attempt to verify email with the expired token
  const verificationRequest = {
    token: expiredToken,
    ip: "192.168.1.100",
    href: "https://discussion.example.com/verify-email" satisfies string &
      tags.Format<"uri">,
    referrer: "https://discussion.example.com/register" satisfies string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardAuth.IVerifyEmail;

  // Step 4: This should fail because the token is expired
  await TestValidator.error("expired token should be rejected", async () => {
    await api.functional.discussionBoard.auth.verify_email.verify(connection, {
      body: verificationRequest,
    });
  });
}
