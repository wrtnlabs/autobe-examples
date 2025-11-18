import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_token_verification_unauthenticated_request(
  connection: api.IConnection,
) {
  // Create a user to establish valid authentication credentials
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphabets(10);

  const createdUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(createdUser);

  TestValidator.predicate(
    "user should be created successfully",
    createdUser.id !== null && createdUser.email === userEmail,
  );

  // Test: Attempt to verify token with a completely unauthenticated connection
  // Create a fresh connection without authentication tokens
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "verify token endpoint should reject unauthenticated requests",
    async () => {
      await api.functional.todoList.user.auth.user.verify_token.verifyToken(
        unauthenticatedConnection,
      );
    },
  );

  // Verify that authentication works correctly by testing with the authenticated connection
  // The connection object now has Authorization header automatically set by join()
  const verificationResult =
    await api.functional.todoList.user.auth.user.verify_token.verifyToken(
      connection,
    );
  typia.assert(verificationResult);

  TestValidator.predicate(
    "token verification should succeed for authenticated requests",
    verificationResult.is_valid === true,
  );

  TestValidator.equals(
    "verified token should belong to created user",
    verificationResult.user_id,
    createdUser.id,
  );
}
