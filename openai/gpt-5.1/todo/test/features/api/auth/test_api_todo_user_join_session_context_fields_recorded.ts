import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodoUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserJoin";

/**
 * Validate that todoUser self-registration accepts and records session context
 * fields.
 *
 * This test focuses on the /auth/todoUser/join endpoint and ensures that
 * connection metadata fields in ITodoAppTodoUserJoin.IRequest (ip, href,
 * referrer) are accepted without error and yield a valid
 * ITodoAppTodoUser.IAuthorized payload.
 *
 * Steps:
 *
 * 1. Build a realistic ITodoAppTodoUserJoin.IRequest payload with:
 *
 *    - Unique email
 *    - Password
 *    - Non-null display_name
 *    - Explicit ip, href, referrer values
 * 2. Call api.functional.auth.todoUser.join and validate that:
 *
 *    - The response matches ITodoAppTodoUser.IAuthorized via typia.assert
 *    - The response email matches the request email
 *    - The optional displayName matches the requested display_name
 *    - The token structure is valid via typia.assert<IAuthorizationToken>
 * 3. Call join again with a second payload identical except ip is null to verify
 *    that null ip is tolerated while href and referrer are still sent.
 */
export async function test_api_todo_user_join_session_context_fields_recorded(
  connection: api.IConnection,
) {
  // 1. First registration: full context including ip
  const email1: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password1: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const displayName1: string = RandomGenerator.name();

  const ip1: string & tags.Format<"ipv4"> = typia.random<
    string & tags.Format<"ipv4">
  >();
  const href1: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer1: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const body1 = {
    email: email1,
    password: password1,
    display_name: displayName1,
    ip: ip1,
    href: href1,
    referrer: referrer1,
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const authorized1: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: body1,
    });
  typia.assert<ITodoAppTodoUser.IAuthorized>(authorized1);

  // Validate that response email and displayName line up with the request
  TestValidator.equals(
    "joined user email should equal request email",
    authorized1.email,
    email1,
  );

  TestValidator.equals(
    "displayName in response should equal request display_name when provided",
    authorized1.displayName ?? null,
    displayName1,
  );

  // Validate token structure
  typia.assert<IAuthorizationToken>(authorized1.token);

  // 2. Second registration: ip explicitly null, href and referrer still provided
  const email2: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password2: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const displayName2: string = RandomGenerator.name();

  const href2: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer2: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const body2 = {
    email: email2,
    password: password2,
    display_name: displayName2,
    ip: null,
    href: href2,
    referrer: referrer2,
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const authorized2: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: body2,
    });
  typia.assert<ITodoAppTodoUser.IAuthorized>(authorized2);

  TestValidator.equals(
    "second joined user email should equal second request email",
    authorized2.email,
    email2,
  );

  TestValidator.equals(
    "second displayName in response should equal second request display_name",
    authorized2.displayName ?? null,
    displayName2,
  );

  typia.assert<IAuthorizationToken>(authorized2.token);
}
