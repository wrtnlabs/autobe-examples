import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test member registration with session context tracking.
 *
 * This test validates that the member registration endpoint properly captures
 * and stores session context information including IP address, href (current
 * page URL), and referrer (previous page URL) for security monitoring and
 * analytics purposes.
 *
 * The test performs the following steps:
 *
 * 1. Generate valid registration credentials and session context data
 * 2. Submit registration request with all session context fields
 * 3. Verify registration success with returned member profile and JWT tokens
 * 4. Validate that session context enables security features and marketing
 *    attribution
 */
export async function test_api_member_registration_session_context_tracking(
  connection: api.IConnection,
) {
  // Generate registration data with session context
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    ip: "203.0.113.42",
    href: "https://discussion-board.example.com/register" as string &
      tags.Format<"uri">,
    referrer:
      "https://discussion-board.example.com/articles/trending" as string &
        tags.Format<"uri">,
  } satisfies IDiscussionBoardMember.ICreate;

  // Register new member with session context
  const registeredMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });

  // Validate registration response - complete type validation
  typia.assert(registeredMember);

  // Verify member profile data matches registration input
  TestValidator.equals(
    "email matches registration",
    registeredMember.email,
    registrationData.email,
  );
  TestValidator.equals(
    "username matches registration",
    registeredMember.username,
    registrationData.username,
  );
  TestValidator.equals(
    "display_name matches registration",
    registeredMember.display_name,
    registrationData.display_name,
  );
  TestValidator.equals(
    "bio matches registration",
    registeredMember.bio,
    registrationData.bio,
  );

  // Verify email verification status (business logic validation)
  TestValidator.equals(
    "email not yet verified",
    registeredMember.email_verified,
    false,
  );
  TestValidator.equals(
    "email_verified_at is null",
    registeredMember.email_verified_at,
    null,
  );

  // Verify account status (business logic validation)
  TestValidator.equals(
    "account not suspended",
    registeredMember.is_suspended,
    false,
  );
  TestValidator.equals(
    "suspension_reason is null",
    registeredMember.suspension_reason,
    null,
  );
  TestValidator.equals(
    "suspended_until is null",
    registeredMember.suspended_until,
    null,
  );
  TestValidator.equals("deleted_at is null", registeredMember.deleted_at, null);
}
