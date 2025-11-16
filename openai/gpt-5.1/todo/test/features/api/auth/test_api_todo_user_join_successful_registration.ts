import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodoUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserJoin";

export async function test_api_todo_user_join_successful_registration(
  connection: api.IConnection,
) {
  // 1. Build a realistic registration payload for ITodoAppTodoUserJoin.IRequest
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(1),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoUserJoin.IRequest;

  // 2. Call the public join endpoint without prior authentication
  const authorized = await api.functional.auth.todoUser.join(connection, {
    body,
  });

  // 3. Strong type assertion on the response structure
  typia.assert<ITodoAppTodoUser.IAuthorized>(authorized);

  // 4. Basic field-level business validations
  TestValidator.equals(
    "email echoes the registration request",
    authorized.email,
    body.email,
  );

  // displayName should reflect display_name when provided (non-null)
  if (body.display_name !== null && body.display_name !== undefined) {
    TestValidator.equals(
      "displayName matches display_name when provided",
      authorized.displayName ?? null,
      body.display_name,
    );
  }

  // status should be a non-empty string (scenario suggests "active" but DTO
  // doesn’t fix the allowed values, so we only assert non-empty)
  TestValidator.predicate(
    "status is initialized to a non-empty value",
    authorized.status.length > 0,
  );

  // created_at and updated_at must be valid date-time strings already ensured
  // by typia.assert, here we only check the ordering created_at <= updated_at
  const createdAt = new Date(authorized.created_at).getTime();
  const updatedAt = new Date(authorized.updated_at).getTime();
  TestValidator.predicate(
    "created_at is not after updated_at",
    createdAt <= updatedAt,
  );

  // last_login_at should be null on first registration according to scenario.
  // The DTO allows undefined, so we normalize with nullish coalescing.
  TestValidator.equals(
    "last_login_at is null on first registration",
    authorized.last_login_at ?? null,
    null,
  );

  // 5. Token structure and basic semantics
  typia.assert<IAuthorizationToken>(authorized.token);

  TestValidator.predicate(
    "access token is a non-empty string",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is a non-empty string",
    authorized.token.refresh.length > 0,
  );

  const now = Date.now();
  const expiredAt = new Date(authorized.token.expired_at).getTime();
  const refreshableUntil = new Date(
    authorized.token.refreshable_until,
  ).getTime();

  TestValidator.predicate(
    "access token expiry is in the future",
    expiredAt > now,
  );
  TestValidator.predicate(
    "refresh token refreshable_until is in the future",
    refreshableUntil > now,
  );
}
