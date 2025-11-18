import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodolistmember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodolistmember";

/**
 * Validates that an authenticated todoListMember can successfully update their
 * own email address immediately after registration.
 *
 * 1. Register a new todoListMember using valid, unique input
 * 2. Capture the member's initial profile (should include id, email, created_at)
 * 3. Generate a unique new email address for update
 * 4. Call self-update endpoint (/todoList/todoListMember/actors/me) to update the
 *    email
 * 5. Assert the response email is updated and id matches the authenticated user
 * 6. Attempt to update the email to an existing (already used) email, expect
 *    failure (uniqueness constraint)
 * 7. Confirm that authentication tokens/session are still valid after update (user
 *    can still perform self-queries)
 */
export async function test_api_todolistmember_update_email_after_registration(
  connection: api.IConnection,
) {
  // 1. Register new member
  const baseEmail: string = typia.random<string & tags.Format<"email">>();
  const basePassword: string = RandomGenerator.alphaNumeric(12);
  const registrationBody = {
    email: baseEmail,
    password: basePassword,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ITodoListTodolistmember.ICreate;
  const registered: ITodoListTodolistmember.IAuthorized =
    await api.functional.auth.todoListMember.join(connection, {
      body: registrationBody,
    });
  typia.assert(registered);

  // 2. Capture initial profile
  const initialId = registered.id;
  const initialEmail = registered.email;
  const initialCreatedAt = registered.created_at;
  TestValidator.equals(
    "response email matches registration",
    registered.email,
    baseEmail,
  );

  // 3. Generate a unique new email
  const updatedEmail: string = typia.random<string & tags.Format<"email">>();

  // 4. Self-update email
  const updateBody = {
    email: updatedEmail,
  } satisfies ITodoListTodolistmember.IUpdate;
  const updatedProfile: ITodoListTodolistmember =
    await api.functional.todoList.todoListMember.actors.me.update(connection, {
      body: updateBody,
    });
  typia.assert(updatedProfile);

  // 5. Validate updated email, id invariant, and created_at invariant
  TestValidator.equals(
    "updated email reflected in profile",
    updatedProfile.email,
    updatedEmail,
  );
  TestValidator.equals("user id is unchanged", updatedProfile.id, initialId);
  TestValidator.equals(
    "created_at is unchanged",
    updatedProfile.created_at,
    initialCreatedAt,
  );

  // 6. Attempt to update email to an existing email (should fail validation)
  await TestValidator.error(
    "should fail when updating to an already used email",
    async () => {
      await api.functional.todoList.todoListMember.actors.me.update(
        connection,
        {
          body: { email: baseEmail } satisfies ITodoListTodolistmember.IUpdate,
        },
      );
    },
  );

  // 7. Confirm authentication/session remains valid
  // Try self-update a second time with a new unique email
  const anotherEmail: string = typia.random<string & tags.Format<"email">>();
  const result2: ITodoListTodolistmember =
    await api.functional.todoList.todoListMember.actors.me.update(connection, {
      body: { email: anotherEmail } satisfies ITodoListTodolistmember.IUpdate,
    });
  typia.assert(result2);
  TestValidator.equals(
    "second email update works",
    result2.email,
    anotherEmail,
  );
  TestValidator.equals("session id invariant", result2.id, initialId);
}
