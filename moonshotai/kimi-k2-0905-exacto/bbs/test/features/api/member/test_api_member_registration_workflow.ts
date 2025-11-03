import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticsBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsMember";

/**
 * Test member registration workflow completion.
 *
 * This test validates the system's ability to handle concurrent user
 * registrations and maintain proper user account isolation. The test creates
 * multiple member accounts with unique credentials to ensure the registration
 * endpoint can handle multiple successful registrations while maintaining data
 * integrity and uniqueness constraints.
 *
 * Test Steps:
 *
 * 1. Generate unique credentials for multiple member accounts
 * 2. Register each member account with valid data
 * 3. Verify all registrations succeed and return proper authorization
 * 4. Validate response data structure and token generation
 * 5. Test duplicate username/email prevention (error case)
 */
export async function test_api_member_registration_workflow(
  connection: api.IConnection,
) {
  const testMembers: IPoliticsBbsMember.IAuthorized[] = [];

  // Create multiple test members with unique credentials
  for (let i = 0; i < 5; i++) {
    const usernameLengths = [3, 4, 5, 6] as const;
    const usernameLength = RandomGenerator.pick(usernameLengths);
    const username = RandomGenerator.alphabets(usernameLength);
    const email = `user${i}_${RandomGenerator.alphabets(5)}@test.com`;
    const password = RandomGenerator.alphaNumeric(8);

    const joinData = {
      username: username,
      email: email,
      password: password,
      href: "https://localhost:3000/register",
      referrer: "https://localhost:3000/signup",
    } satisfies IPoliticsBbsMember.IJoin;

    const member = await api.functional.auth.members.join(connection, {
      body: joinData,
    });

    typia.assert(member);
    TestValidator.equals(
      "username matches creation request",
      member.username,
      username,
    );
    TestValidator.equals("email matches creation request", member.email, email);
    TestValidator.predicate("member has valid ID format", member.id.length > 0);
    TestValidator.predicate(
      "token access is provided",
      member.token.access.length > 0,
    );
    TestValidator.predicate(
      "token refresh is provided",
      member.token.refresh.length > 0,
    );
    TestValidator.predicate(
      "token has expiration",
      member.token.expired_at.length > 0,
    );
    TestValidator.predicate(
      "token is refreshable",
      member.token.refreshable_until.length > 0,
    );
    TestValidator.equals("member role is member", member.role, "member");

    testMembers.push(member);
  }

  // Verify all members have unique data
  TestValidator.equals(
    "all usernames are unique",
    new Set(testMembers.map((m) => m.username)).size,
    testMembers.length,
  );
  TestValidator.equals(
    "all emails are unique",
    new Set(testMembers.map((m) => m.email)).size,
    testMembers.length,
  );
  TestValidator.equals(
    "all IDs are unique",
    new Set(testMembers.map((m) => m.id)).size,
    testMembers.length,
  );

  // Test duplicate registration prevention
  await TestValidator.error(
    "duplicate username registration should fail",
    async () => {
      await api.functional.auth.members.join(connection, {
        body: {
          username: testMembers[0].username,
          email: `new_${RandomGenerator.alphabets(6)}@test.com`,
          password: RandomGenerator.alphaNumeric(8),
          href: "https://localhost:3000/register",
          referrer: "https://localhost:3000/signup",
        } satisfies IPoliticsBbsMember.IJoin,
      });
    },
  );

  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.members.join(connection, {
        body: {
          username: RandomGenerator.alphabets(6),
          email: testMembers[0].email,
          password: RandomGenerator.alphaNumeric(8),
          href: "https://localhost:3000/register",
          referrer: "https://localhost:3000/signup",
        } satisfies IPoliticsBbsMember.IJoin,
      });
    },
  );
}
