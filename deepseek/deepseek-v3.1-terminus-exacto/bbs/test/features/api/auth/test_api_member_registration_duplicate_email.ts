import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test member registration with duplicate email address.
 *
 * This test validates that the discussion board member registration system
 * properly enforces email uniqueness constraints. It creates an initial member
 * account with a randomly generated email address, then attempts to register a
 * second account using the same email address. The test verifies that the
 * second registration attempt fails with an appropriate error response,
 * ensuring that duplicate email addresses cannot be used for multiple
 * accounts.
 */
export async function test_api_member_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Generate random test data for the first member registration
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name(1);
  const password = RandomGenerator.alphaNumeric(12);
  const href = "https://example.com/register";
  const referrer = "https://example.com";

  // Step 1: Create initial member account
  const firstMember = await api.functional.auth.member.join(connection, {
    body: {
      email: email,
      username: username,
      password: password,
      display_name: undefined,
      bio: undefined,
      ip: undefined,
      href: href,
      referrer: referrer,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(firstMember);

  // Step 2: Attempt to register second account with same email
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          email: email,
          username: RandomGenerator.name(1),
          password: RandomGenerator.alphaNumeric(12),
          display_name: undefined,
          bio: undefined,
          ip: undefined,
          href: href,
          referrer: referrer,
        } satisfies IDiscussionBoardMember.ICreate,
      });
    },
  );

  // Step 3: Validate that first account remains accessible and unchanged
  // Note: Since there's no direct "get member" API in the provided functions,
  // we verify that the initial registration was successful and the error
  // occurred specifically for the duplicate email attempt
  TestValidator.predicate(
    "first member registration was successful",
    firstMember.email === email,
  );
  TestValidator.predicate(
    "first member has valid token",
    typeof firstMember.token.access === "string" &&
      firstMember.token.access.length > 0,
  );
}
