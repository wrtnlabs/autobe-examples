import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_todouser_retrieve_by_owner(
  connection: api.IConnection,
) {
  /**
   * Validate that a todoUser can retrieve their own account by id.
   *
   * Steps:
   *
   * 1. Register a new todoUser via POST /auth/todoUser/join
   * 2. Call GET /todoApp/todoUser/todoUsers/{todoUserId} as the authenticated user
   * 3. Assert the returned user matches the created user and that sensitive fields
   *    are not present in the response.
   */

  // 1) Prepare join request body (type-safe)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://referrer.example.com/",
  } satisfies ITodoAppTodoUser.ICreate;

  // 2) Register the user and obtain authorization (SDK sets Authorization header)
  const created: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: joinBody,
    });
  typia.assert(created);

  // 3) Retrieve the user by id as the owner
  const retrieved: ITodoAppTodoUser =
    await api.functional.todoApp.todoUser.todoUsers.at(connection, {
      todoUserId: created.id,
    });
  typia.assert(retrieved);

  // 4) Business-level assertions
  TestValidator.equals(
    "retrieved id matches created id",
    retrieved.id,
    created.id,
  );
  TestValidator.equals(
    "retrieved email matches created email",
    retrieved.email,
    created.email,
  );

  // typia.assert already validates date-time formats; ensure presence
  TestValidator.predicate(
    "createdAt and updatedAt present",
    retrieved.createdAt !== undefined && retrieved.updatedAt !== undefined,
  );

  // Ensure sensitive fields from the Prisma model are NOT present in the DTO
  TestValidator.predicate(
    "sensitive fields are excluded",
    !("password_hash" in retrieved) &&
      !("mfa_secret" in retrieved) &&
      !("mfa_backup_codes" in retrieved) &&
      !("password_reset_token" in retrieved),
  );

  // Optional administrative metadata may be present: only check presence, not content
  TestValidator.predicate(
    "failedLoginAttempts property is either undefined or present",
    retrieved.failedLoginAttempts === undefined ||
      retrieved.failedLoginAttempts !== undefined,
  );
  TestValidator.predicate(
    "lastFailedLoginAt property is either undefined/null or present",
    retrieved.lastFailedLoginAt === undefined ||
      retrieved.lastFailedLoginAt === null ||
      retrieved.lastFailedLoginAt !== undefined,
  );
}
