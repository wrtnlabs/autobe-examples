import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticsBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsMember";

/**
 * Test member login failure with incorrect password
 *
 * This test validates that the system properly handles invalid password login
 * attempts for members on the politics discussion board. The test follows this
 * workflow:
 *
 * 1. Register a new member account using the join endpoint
 * 2. Attempt to login with the correct username but incorrect password
 * 3. Verify that the login attempt fails with appropriate error handling
 * 4. Ensure the system maintains security by not revealing account status
 *    information
 *
 * The test should demonstrate that the authentication system properly rejects
 * invalid credentials while maintaining proper security practices.
 */
export async function test_api_member_login_invalid_password(
  connection: api.IConnection,
) {
  // Step 1: Create a member account to test invalid password login
  const joinData = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "ValidPassword123",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IPoliticsBbsMember.IJoin;

  const member = await api.functional.auth.members.join(connection, {
    body: joinData,
  });
  typia.assert(member);

  // Verify member was created successfully
  TestValidator.equals(
    "member username matches",
    member.username,
    joinData.username,
  );
  TestValidator.equals("member email matches", member.email, joinData.email);

  // Step 2: Attempt login with incorrect password
  const loginData = {
    username: joinData.username,
    password: "WrongPassword123", // Different from the actual password
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IPoliticsBbsMember.ILogin;

  // Test that login with wrong password fails
  await TestValidator.error(
    "login with incorrect password should fail",
    async () => {
      await api.functional.auth.members.login(connection, {
        body: loginData,
      });
    },
  );

  // Step 3: Verify security is maintained (system should not reveal account exists)
  // Also test with completely invalid username to test consistent error handling
  const invalidLoginData = {
    username: "invalidusername12345",
    password: "SomePassword123",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IPoliticsBbsMember.ILogin;

  await TestValidator.error(
    "login with invalid username should fail consistently",
    async () => {
      await api.functional.auth.members.login(connection, {
        body: invalidLoginData,
      });
    },
  );
}
