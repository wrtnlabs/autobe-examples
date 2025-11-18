import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserQuota } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserQuota";

export async function test_api_user_quota_retrieval_invalid_user_id(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user for permission validation context
  const userEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const userData = {
    email: userEmail,
    password: "TestPassword123!",
    href: "https://example.com/home",
    referrer: "https://example.com/register",
  } satisfies ITodoAppUser.IJoin;

  const user = await api.functional.auth.user.join(connection, {
    body: userData,
  });
  typia.assert(user);
  TestValidator.predicate(
    "user created successfully",
    () => user.id !== null && user.email !== null,
  );

  // Step 2: Test malformed UUID format to validate input sanitization
  const malformedUUID = "not-a-valid-uuid";
  await TestValidator.error("should reject malformed UUID format", async () => {
    await api.functional.todoApp.user.userQuotas.user.at(connection, {
      userId: malformedUUID,
    });
  });

  // Step 3: Test non-existent valid UUID to ensure data integrity
  const nonExistentValidUUID = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should reject non-existent valid UUID",
    async () => {
      await api.functional.todoApp.user.userQuotas.user.at(connection, {
        userId: nonExistentValidUUID,
      });
    },
  );

  // Step 4: Test edge case UUID formats for robust validation
  const emptyString = "";
  await TestValidator.error("should reject empty string as UUID", async () => {
    await api.functional.todoApp.user.userQuotas.user.at(connection, {
      userId: emptyString,
    });
  });

  // Step 5: Test partially valid UUID (5-4-4-4-12 format but invalid characters)
  const partiallyValidUUID = "zzzz0000-0000-0000-0000-000000000000";
  await TestValidator.error(
    "should reject UUID with invalid characters",
    async () => {
      await api.functional.todoApp.user.userQuotas.user.at(connection, {
        userId: partiallyValidUUID,
      });
    },
  );

  // Step 6: Test successful retrieval with valid user ID to ensure system works
  const userQuota = await api.functional.todoApp.user.userQuotas.user.at(
    connection,
    { userId: user.id },
  );
  typia.assert(userQuota);
  TestValidator.predicate(
    "valid user ID returns quota data",
    () => userQuota.user.id === user.id,
  );
}
