import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Verify that retrieving the authenticated user's profile without a proper
 * authentication token is forbidden.
 *
 * This test ensures that calling /todoList/user/users/self without an
 * Authorization header, or with invalid or unrelated tokens, is reliably
 * denied. No user profile information should be returned, and an authorization
 * error must be raised every time. The logic is as follows:
 *
 * 1. Create an unauthenticated connection by setting headers to an empty object.
 * 2. Attempt to call api.functional.todoList.user.users.self.at with the
 *    unauthenticated connection. It must throw an error.
 * 3. Generate a series of invalid, expired, or unrelated tokens (random fake JWTs)
 *    and call the endpoint with each as Authorization: Bearer <token>. Every
 *    request must result in an authorization error.
 * 4. No response should ever contain user profile data.
 */
export async function test_api_user_self_profile_retrieval_without_auth(
  connection: api.IConnection,
) {
  // 1. Create unauthenticated connection (no Authorization header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  // 2. Attempt access with no headers
  await TestValidator.error(
    "Accessing /todoList/user/users/self without Authorization header must fail",
    async () => {
      await api.functional.todoList.user.users.self.at(unauthConn);
    },
  );

  // 3. Attempt access with invalid/malformed/expired/unrelated tokens
  const invalidTokens = [
    "not-a-jwt", // not JWT
    "Bearer this.is.not.a.valid.jwt.token",
    RandomGenerator.alphaNumeric(32),
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid-signature.payload",
    "", // empty string
  ];
  for (const token of invalidTokens) {
    const connWithFakeToken: api.IConnection = {
      ...connection,
      headers: { Authorization: "Bearer " + token },
    };
    await TestValidator.error(
      `Access with invalid Authorization: Bearer ${token || "<empty>"} must fail`,
      async () => {
        await api.functional.todoList.user.users.self.at(connWithFakeToken);
      },
    );
  }
}
