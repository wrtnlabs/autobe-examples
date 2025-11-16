import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";

/**
 * Test member registration fails with duplicate username.
 *
 * This test validates that the member registration system enforces username
 * uniqueness as a core constraint. The test follows a two-step approach:
 *
 * 1. Successfully create the first member with a unique username
 * 2. Attempt to create a second member with the same username
 *
 * It verifies the system's failure handling for this business constraint while
 * ensuring both members would otherwise have valid registration data. This
 * tests the fundamental requirement that usernames serve as unique identifiers
 * within the economic discussion community.
 */
export async function test_api_member_registration_duplicate_username(
  connection: api.IConnection,
) {
  // Generate unique username for the first member
  const duplicateUsername = RandomGenerator.alphabets(8);

  // Generate email addresses for both registrations
  const email1 = typia.random<string & tags.Format<"email">>();
  const email2 = typia.random<string & tags.Format<"email">>();

  // Ensure emails are different while keeping same username
  TestValidator.notEquals("emails should be different", email1, email2);
  TestValidator.equals(
    "usernames should be identical",
    duplicateUsername,
    duplicateUsername,
  );

  // First registration - should succeed
  const firstMember = await api.functional.auth.member.join(connection, {
    body: {
      username: duplicateUsername,
      email: email1,
      password: RandomGenerator.alphabets(10),
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(firstMember);

  // Second registration with same username - should fail
  await TestValidator.error(
    "registration with duplicate username should fail",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          username: duplicateUsername,
          email: email2,
          password: RandomGenerator.alphabets(10),
        } satisfies IEconomicDiscussionMember.ICreate,
      });
    },
  );
}
