import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodolistmember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodolistmember";

/**
 * Test duplicate email registration for todoListMember account creation.
 *
 * This test attempts to register a todoListMember using an email address that
 * has already been registered previously. It performs the following steps:
 *
 * 1. Register an initial todoListMember with a unique random email and password
 *    (simulating a normal registration flow using self-signup).
 * 2. Attempt a second registration using the same email address and a different
 *    password, but with valid required fields (href, referrer, optional ip).
 * 3. Validate that the registration fails due to email duplication, asserting:
 *
 *    - The API does not issue a JWT token or create a new account.
 *    - An error is returned that matches the expected error handling and response
 *         pattern for this business rule.
 *    - The error response includes information about the duplication issue,
 *         compliant with the API's error style.
 */
export async function test_api_todolistmember_account_registration_duplicate_email(
  connection: api.IConnection,
) {
  // 1. Register initial todoListMember (setup precondition)
  const email = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
  >();
  const password1 = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const createDto1 = {
    email,
    password: password1,
    href: "https://todolist.example.com/register",
    referrer: "https://todolist.example.com/",
    ip: null,
  } satisfies ITodoListTodolistmember.ICreate;
  const registered = await api.functional.auth.todoListMember.join(connection, {
    body: createDto1,
  });
  typia.assert(registered);

  // 2. Attempt duplicate registration with same email and valid fields
  const password2 = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const createDto2 = {
    email,
    password: password2,
    href: "https://todolist.example.com/try-duplicate",
    referrer: "https://todolist.example.com/register",
    ip: null,
  } satisfies ITodoListTodolistmember.ICreate;
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.todoListMember.join(connection, {
        body: createDto2,
      });
    },
  );
}
