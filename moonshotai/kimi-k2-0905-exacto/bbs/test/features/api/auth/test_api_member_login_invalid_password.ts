import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";

/**
 * Test member login fails with incorrect password
 *
 * This test validates that the authentication system properly rejects login
 * attempts when an incorrect password is provided. It ensures that:
 *
 * - Valid member accounts can be created through the join API
 * - Login attempts with wrong passwords are properly rejected
 * - The system provides appropriate error responses for security purposes
 * - No authentication tokens are issued on failed attempts
 *
 * Test flow:
 *
 * 1. Register a new member account with valid credentials
 * 2. Attempt to login with the same email but wrong password
 * 3. Verify the API rejects the authentication attempt
 * 4. Ensure proper error handling without revealing security details
 */
export async function test_api_member_login_invalid_password(
  connection: api.IConnection,
) {
  // Create a new member account for testing
  const memberData = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "validstrongpassword123",
  } satisfies IEconomicDiscussionMember.ICreate;

  // Register the member account
  const createdMember = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(createdMember);

  TestValidator.equals(
    "member created successfully",
    createdMember.member.email,
    memberData.email,
  );

  // Attempt to login with incorrect password
  const invalidLoginData = {
    email: memberData.email,
    password_hash: "wrongpassword123",
  } satisfies IEconomicDiscussionMember.ILogin;

  // Test that login with incorrect password should fail
  await TestValidator.error(
    "login with wrong password should fail",
    async () => {
      return await api.functional.auth.member.login(connection, {
        body: invalidLoginData,
      });
    },
  );
}
