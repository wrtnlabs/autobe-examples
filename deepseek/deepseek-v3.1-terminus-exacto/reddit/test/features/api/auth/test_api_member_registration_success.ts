import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test successful member registration workflow with valid credentials and
 * complete session context. Validates that new member accounts can be created
 * with proper email, password, and display name information, and that the
 * system returns appropriate authentication tokens upon successful
 * registration. The test verifies that the response includes member profile
 * data, JWT tokens with expiration information, and that all required fields
 * are properly populated. Additionally, validates that the system enforces
 * email uniqueness by attempting to register with the same email address should
 * fail.
 */
export async function test_api_member_registration_success(
  connection: api.IConnection,
) {
  // Generate realistic test data for member registration
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberDisplayName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 7,
  });

  // Generate session context data
  const clientIp = RandomGenerator.alphabets(10);
  const currentUrl = typia.random<string & tags.Format<"uri">>();
  const referrerUrl = typia.random<string & tags.Format<"uri">>();

  // Step 1: Successful member registration
  const registrationData = {
    email: memberEmail,
    password: memberPassword,
    display_name: memberDisplayName,
    ip: clientIp,
    href: currentUrl,
    referrer: referrerUrl,
  } satisfies ICommunityPlatformMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: registrationData,
  });

  // Validate response structure and content
  typia.assert(member);

  // Verify member profile data
  TestValidator.equals(
    "member email matches registration email",
    member.email,
    memberEmail,
  );
  TestValidator.equals(
    "member display name matches registration",
    member.display_name,
    memberDisplayName,
  );
  TestValidator.predicate(
    "member has valid UUID ID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      member.id,
    ),
  );
  TestValidator.equals(
    "new member has zero karma score",
    member.karma_score,
    0,
  );
  TestValidator.equals("new member is not verified", member.is_verified, false);
  TestValidator.predicate(
    "member has creation timestamp",
    member.created_at !== null && member.created_at !== undefined,
  );
  TestValidator.predicate(
    "member has update timestamp",
    member.updated_at !== null && member.updated_at !== undefined,
  );

  // Verify token structure
  TestValidator.predicate(
    "member has access token",
    member.token.access.length > 0,
  );
  TestValidator.predicate(
    "member has refresh token",
    member.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "member has token expiration date",
    member.token.expired_at !== null && member.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "member has refreshable until date",
    member.token.refreshable_until !== null &&
      member.token.refreshable_until !== undefined,
  );

  // Step 2: Test email uniqueness enforcement
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          email: memberEmail,
          password: typia.random<string & tags.MinLength<8>>(),
          display_name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 7,
          }),
          href: currentUrl,
          referrer: referrerUrl,
        } satisfies ICommunityPlatformMember.ICreate,
      });
    },
  );

  // Step 3: Test with different email (should succeed)
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMember = await api.functional.auth.member.join(connection, {
    body: {
      email: secondMemberEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      display_name: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 3,
        wordMax: 7,
      }),
      href: currentUrl,
      referrer: referrerUrl,
    } satisfies ICommunityPlatformMember.ICreate,
  });

  typia.assert(secondMember);
  TestValidator.equals(
    "second member email matches registration",
    secondMember.email,
    secondMemberEmail,
  );
  TestValidator.notEquals(
    "second member ID should be different from first",
    secondMember.id,
    member.id,
  );
}
