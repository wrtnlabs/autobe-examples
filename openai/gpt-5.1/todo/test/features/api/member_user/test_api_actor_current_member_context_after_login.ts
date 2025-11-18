import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IETodoAppActorKind } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoAppActorKind";
import type { ITodoAppActorCurrent } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppActorCurrent";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_actor_current_member_context_after_login(
  connection: api.IConnection,
) {
  // 1. Register a new member user via join to establish a stable identity.
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const joinBody = {
    email,
    password,
    displayName: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const joined: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // Create a fresh unauthenticated connection for explicit login tests.
  const baseConnection: api.IConnection = { ...connection, headers: {} };

  // 2. Explicit login with the same credentials using the fresh connection.
  const loginBody = {
    email,
    password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserLogin.ICreate;

  const loggedIn: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(baseConnection, {
      body: loginBody,
    });
  typia.assert(loggedIn);

  TestValidator.equals(
    "joined and logged-in member id should match",
    loggedIn.id,
    joined.id,
  );
  TestValidator.equals(
    "joined and logged-in member email should match",
    loggedIn.email,
    joined.email,
  );

  // 3. Create a todo as this member to ensure the session works.
  const todoBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    due_date: new Date().toISOString(),
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(baseConnection, {
      body: todoBody,
    });
  typia.assert(createdTodo);

  TestValidator.equals(
    "todo should belong to logged-in member by id",
    createdTodo.memberUser.id,
    loggedIn.id,
  );

  // 4. Call /todoApp/memberUser/actors/current twice to validate actor context.
  const actor1: ITodoAppActorCurrent =
    await api.functional.todoApp.memberUser.actors.current.at(baseConnection);
  typia.assert(actor1);

  const actor2: ITodoAppActorCurrent =
    await api.functional.todoApp.memberUser.actors.current.at(baseConnection);
  typia.assert(actor2);

  // 5. Validate business invariants for actor context.
  TestValidator.equals(
    "actorKind must be memberUser",
    actor1.actorKind,
    "memberUser",
  );

  TestValidator.equals(
    "adminUser must be null for member session",
    actor1.adminUser,
    null,
  );
  TestValidator.equals(
    "guestUser must be null for member session",
    actor1.guestUser,
    null,
  );

  // memberUser summary should be non-null and match logged-in member.
  TestValidator.predicate(
    "memberUser summary should be non-null",
    () => actor1.memberUser !== null,
  );

  if (actor1.memberUser !== null) {
    TestValidator.equals(
      "actor memberUser id should match logged-in id",
      actor1.memberUser.id,
      loggedIn.id,
    );
    TestValidator.equals(
      "actor memberUser email should match logged-in email",
      actor1.memberUser.email,
      loggedIn.email,
    );
    TestValidator.equals(
      "actor memberUser status should match logged-in status",
      actor1.memberUser.status,
      loggedIn.status,
    );
  }

  // 6. Ensure stability: repeated /actors/current calls should be consistent.
  TestValidator.equals(
    "actorKind should remain stable across calls",
    actor2.actorKind,
    actor1.actorKind,
  );

  TestValidator.equals(
    "adminUser should remain null across calls",
    actor2.adminUser,
    actor1.adminUser,
  );

  TestValidator.equals(
    "guestUser should remain null across calls",
    actor2.guestUser,
    actor1.guestUser,
  );

  // For memberUser, validate identity equality when both non-null.
  TestValidator.predicate(
    "memberUser identity stable across calls",
    () =>
      actor1.memberUser !== null &&
      actor2.memberUser !== null &&
      actor1.memberUser.id === actor2.memberUser.id &&
      actor1.memberUser.email === actor2.memberUser.email,
  );
}
