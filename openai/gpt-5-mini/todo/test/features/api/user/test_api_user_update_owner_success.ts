import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_user_update_owner_success(
  connection: api.IConnection,
) {
  // 1) Register a new user via POST /auth/user/join
  const registerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd123",
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppUser.ICreate;

  const authorized: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: registerBody });
  typia.assert(authorized);

  // 2) Prepare owner update payload and call PUT /todoApp/user/users/{userId}
  const newDisplayName = RandomGenerator.name();
  const updateBody = {
    display_name: newDisplayName,
  } satisfies ITodoAppUser.IUpdate;

  const updated: ITodoAppUser = await api.functional.todoApp.user.users.update(
    connection,
    {
      userId: authorized.id,
      body: updateBody,
    },
  );
  typia.assert(updated);

  // 3) Validate returned data and business rules
  TestValidator.equals(
    "id matches the owner being updated",
    updated.id,
    authorized.id,
  );
  TestValidator.equals(
    "email is preserved after update",
    updated.email,
    authorized.email,
  );
  TestValidator.equals(
    "display_name was updated",
    updated.display_name,
    updateBody.display_name,
  );

  // typia.assert(updated) already ensures sensitive fields like password_hash
  // are not present in the returned ITodoAppUser shape. We still assert the
  // datetime semantics described in the scenario.
  TestValidator.predicate(
    "updated_at is an ISO-8601 date-time string",
    !Number.isNaN(Date.parse(updated.updated_at)),
  );

  // If created_at exists on the authorization result, ensure updated_at >= created_at
  if (authorized.created_at !== null && authorized.created_at !== undefined) {
    const createdMs = Date.parse(authorized.created_at);
    const updatedMs = Date.parse(updated.updated_at);
    TestValidator.predicate(
      "updated_at is not earlier than created_at",
      updatedMs >= createdMs,
    );
  }
}
