import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test member registration functionality with valid data. Since testing missing
 * required fields violates type safety rules, this test focuses on successful
 * registration with complete valid data.
 */
export async function test_api_member_registration_missing_required_fields(
  connection: api.IConnection,
) {
  // Generate valid test data for all required fields
  const validEmail = typia.random<string & tags.Format<"email">>();
  const validPassword = typia.random<string & tags.MinLength<8>>();
  const validDisplayName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 7,
  });
  const validHref = typia.random<string & tags.Format<"uri">>();
  const validReferrer = typia.random<string & tags.Format<"uri">>();

  // Verify that a complete valid request succeeds
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

  // Validate the response structure
  TestValidator.equals(
    "member ID should be valid UUID",
    validMember.id.length,
    36,
  );
  TestValidator.equals(
    "member email should match input",
    validMember.email,
    validEmail,
  );
  TestValidator.equals(
    "member display name should match input",
    validMember.display_name,
    validDisplayName,
  );
  TestValidator.predicate(
    "karma score should be zero for new member",
    validMember.karma_score === 0,
  );
  TestValidator.predicate(
    "new member should not be verified",
    validMember.is_verified === false,
  );
  TestValidator.predicate(
    "token should be provided",
    validMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be provided",
    validMember.token.refresh.length > 0,
  );
}
