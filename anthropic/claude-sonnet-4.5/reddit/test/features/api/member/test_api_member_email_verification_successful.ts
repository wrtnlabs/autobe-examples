import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test member registration which triggers email verification token generation.
 *
 * This test validates the member registration process that initiates the email
 * verification workflow. During registration:
 *
 * 1. A new member account is created with username, email, and password
 * 2. The system generates a verification token (sent via email in production)
 * 3. The member's email_verified status is initially set to false
 * 4. JWT tokens are issued for immediate platform access
 *
 * Note: Complete email verification testing requires access to the verification
 * token, which is sent via email and not returned in the API response for
 * security reasons. This test focuses on the registration portion that
 * initiates the verification workflow.
 */
export async function test_api_member_email_verification_successful(
  connection: api.IConnection,
) {
  // Generate test member data with proper constraints
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const registrationBody = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
  } satisfies IRedditLikeMember.ICreate;

  // Register new member account
  const registeredMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationBody,
    });
  typia.assert(registeredMember);

  // Validate registration response structure and data
  TestValidator.equals(
    "registered member email matches input",
    registeredMember.email,
    memberEmail,
  );
  TestValidator.equals(
    "registered member username matches input",
    registeredMember.username,
    memberUsername,
  );
  TestValidator.equals(
    "email should not be verified initially",
    registeredMember.email_verified,
    false,
  );

  // Validate initial karma values are zero
  TestValidator.equals(
    "initial post karma should be zero",
    registeredMember.post_karma,
    0,
  );
  TestValidator.equals(
    "initial comment karma should be zero",
    registeredMember.comment_karma,
    0,
  );

  // Validate authentication tokens are provided
  TestValidator.predicate(
    "access token should be present",
    registeredMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be present",
    registeredMember.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "member ID should be valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      registeredMember.id,
    ),
  );
}
