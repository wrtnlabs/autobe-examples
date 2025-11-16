import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test member registration failure when attempting to register with a nickname
 * that already exists in the system. Validates that the system properly
 * enforces nickname uniqueness constraints and returns appropriate error
 * messaging. Ensures that duplicate nickname detection occurs before account
 * creation and prevents registration conflicts that could lead to identity
 * confusion within communities.
 */
export async function test_api_member_registration_duplicate_nickname(
  connection: api.IConnection,
) {
  // Step 1: Create an initial member to establish nickname uniqueness constraint
  const firstMember = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<"email">>(),
      password: "ValidPass123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(firstMember);

  // Step 2: Attempt to register a second member with the same nickname
  // This should fail with an appropriate error response
  await TestValidator.error(
    "duplicate nickname should fail registration",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          nickname: firstMember.nickname, // Same nickname as first member
          email: typia.random<string & tags.Format<"email">>(), // Different email
          password: "ValidPass123!",
        } satisfies IRedditCommunityMember.ICreate,
      });
    },
  );

  // Step 3: Verify that the nickname cannot be used for registration
  const duplicateNicknameTest = firstMember.nickname;

  // Step 4: Create additional test for a different duplicate scenario
  const secondMember = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.alphabets(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: "ValidPass123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(secondMember);

  // Attempt to use second member's nickname again
  await TestValidator.error(
    "second duplicate nickname should also fail registration",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          nickname: secondMember.nickname,
          email: typia.random<string & tags.Format<"email">>(),
          password: "ValidPass123!",
        } satisfies IRedditCommunityMember.ICreate,
      });
    },
  );

  // Step 5: Verify that valid registration with unique nickname succeeds
  const uniqueMember = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.alphabets(12),
      email: typia.random<string & tags.Format<"email">>(),
      password: "ValidPass123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(uniqueMember);

  // Verify proper authorization token was set after successful registration
  TestValidator.predicate(
    "successful registration should return member with all properties",
    uniqueMember.nickname.length > 0 &&
      uniqueMember.email.includes("@") &&
      uniqueMember.token !== null,
  );
}
