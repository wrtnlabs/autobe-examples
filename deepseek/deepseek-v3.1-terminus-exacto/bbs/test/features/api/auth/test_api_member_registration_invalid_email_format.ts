import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test member registration functionality with valid email formats. Since the
 * API uses TypeScript type validation with email format constraints, this test
 * focuses on successful registration scenarios with properly formatted email
 * addresses that comply with RFC 5322 standards.
 */
export async function test_api_member_registration_invalid_email_format(
  connection: api.IConnection,
) {
  // Generate multiple valid email addresses using typia's random generator
  const validEmails = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"email">>(),
  );

  // Test registration with each valid email address
  for (const validEmail of validEmails) {
    const username = RandomGenerator.alphaNumeric(8);
    const displayName = RandomGenerator.name();

    const member = await api.functional.auth.member.join(connection, {
      body: {
        email: validEmail,
        username: username,
        password: "Password123!",
        display_name: displayName,
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        ip: "192.168.1.1",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardMember.ICreate,
    });

    typia.assert(member);

    // Validate the response contains the correct data
    TestValidator.equals(
      "member email should match registration input",
      member.email,
      validEmail,
    );

    TestValidator.equals(
      "member username should match registration input",
      member.username,
      username,
    );

    TestValidator.equals(
      "member display name should match registration input",
      member.display_name,
      displayName,
    );

    TestValidator.predicate(
      "member should have a valid UUID ID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        member.id,
      ),
    );

    TestValidator.predicate(
      "member should have creation timestamp",
      member.created_at !== undefined && member.created_at.length > 0,
    );

    TestValidator.predicate(
      "member should have update timestamp",
      member.updated_at !== undefined && member.updated_at.length > 0,
    );

    TestValidator.predicate(
      "member should have authentication token",
      member.token !== undefined &&
        member.token.access !== undefined &&
        member.token.access.length > 0,
    );
  }

  // Test registration with minimal required fields only
  const minimalEmail = typia.random<string & tags.Format<"email">>();
  const minimalMember = await api.functional.auth.member.join(connection, {
    body: {
      email: minimalEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: "MinimalPass123!",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ICreate,
  });

  typia.assert(minimalMember);

  TestValidator.equals(
    "minimal registration email should match input",
    minimalMember.email,
    minimalEmail,
  );

  TestValidator.predicate(
    "minimal registration should succeed with basic fields",
    minimalMember.id !== undefined && minimalMember.id.length > 0,
  );
}
