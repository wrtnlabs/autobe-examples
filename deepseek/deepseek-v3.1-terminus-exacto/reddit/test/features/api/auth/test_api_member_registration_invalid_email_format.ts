import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test member registration validation by ensuring proper email format
 * validation. This test validates that the API properly handles email format
 * constraints through business logic validation rather than type system
 * testing.
 */
export async function test_api_member_registration_invalid_email_format(
  connection: api.IConnection,
) {
  // Generate valid test data for all required fields
  const validPassword = RandomGenerator.alphaNumeric(12);
  const validDisplayName = RandomGenerator.name();
  const validHref = "https://example.com/register";
  const validReferrer = "https://example.com/home";

  // Test successful registration with valid email format
  const validEmail = typia.random<string & tags.Format<"email">>();
  const validMember = await api.functional.auth.member.join(connection, {
    body: {
      email: validEmail,
      password: validPassword,
      display_name: validDisplayName,
      href: validHref,
      referrer: validReferrer,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(validMember);
  TestValidator.equals(
    "valid registration should return member data with matching email",
    validMember.email,
    validEmail,
  );

  // Test that duplicate email registration fails (business logic validation)
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          email: validEmail, // Same email as previously registered
          password: validPassword,
          display_name: validDisplayName,
          href: validHref,
          referrer: validReferrer,
        } satisfies ICommunityPlatformMember.ICreate,
      });
    },
  );

  // Test registration with different valid email formats
  const anotherValidEmail = typia.random<string & tags.Format<"email">>();
  const anotherMember = await api.functional.auth.member.join(connection, {
    body: {
      email: anotherValidEmail,
      password: validPassword,
      display_name: validDisplayName,
      href: validHref,
      referrer: validReferrer,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(anotherMember);
  TestValidator.equals(
    "second valid registration should succeed",
    anotherMember.email,
    anotherValidEmail,
  );

  // Test that the system properly validates email uniqueness
  await TestValidator.error(
    "second duplicate email registration should fail",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          email: anotherValidEmail, // Duplicate of second registration
          password: validPassword,
          display_name: validDisplayName,
          href: validHref,
          referrer: validReferrer,
        } satisfies ICommunityPlatformMember.ICreate,
      });
    },
  );

  // Validate that registered members have proper structure
  TestValidator.predicate(
    "registered member should have valid UUID",
    validMember.id.length === 36,
  );
  TestValidator.predicate(
    "registered member should have display name",
    validMember.display_name.length > 0,
  );
  TestValidator.predicate(
    "registered member should have karma score",
    validMember.karma_score >= 0,
  );
  TestValidator.predicate(
    "registered member should have token",
    validMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "registered member should have refresh token",
    validMember.token.refresh.length > 0,
  );
}
