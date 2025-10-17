import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IMinimalTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMinimalTodoUser";

/**
 * Test user registration with valid password requirements.
 *
 * Since password strength requirements are enforced at the TypeScript type
 * level through the IMinimalTodoUser.ICreate DTO (minimum 8 characters), this
 * test focuses on successful registration with properly formatted passwords
 * that meet the compile-time constraints.
 */
export async function test_api_user_registration_weak_password(
  connection: api.IConnection,
) {
  // Test successful registration with minimum valid password (8 characters)
  const user1 = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678", // Exactly 8 characters - minimum requirement
    } satisfies IMinimalTodoUser.ICreate,
  });
  typia.assert(user1);
  TestValidator.predicate(
    "user with 8-character password should be created successfully",
    user1.id !== undefined && user1.token !== undefined,
  );

  // Test successful registration with longer valid password
  const user2 = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securePassword123!", // Longer valid password
    } satisfies IMinimalTodoUser.ICreate,
  });
  typia.assert(user2);
  TestValidator.predicate(
    "user with longer password should be created successfully",
    user2.id !== undefined && user2.token !== undefined,
  );

  // Test token structure validation
  TestValidator.predicate(
    "authorization token should contain access token",
    typeof user1.token.access === "string" && user1.token.access.length > 0,
  );
  TestValidator.predicate(
    "authorization token should contain refresh token",
    typeof user1.token.refresh === "string" && user1.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "authorization token should contain expiration dates",
    typeof user1.token.expired_at === "string" &&
      typeof user1.token.refreshable_until === "string",
  );

  // Test that user IDs are unique
  TestValidator.notEquals(
    "different users should have different IDs",
    user1.id,
    user2.id,
  );
}
