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

/**
 * Validate that GET /todoApp/memberUser/actors/current enforces authentication.
 *
 * Business goals:
 *
 * - Prove that an authenticated memberUser can successfully retrieve their
 *   unified actor representation via /todoApp/memberUser/actors/current.
 * - Prove that an unauthenticated request to the same endpoint fails with an
 *   authentication error and never returns an ITodoAppActorCurrent payload.
 * - Show that existence of valid actors (member/admin/guest) and configured
 *   system settings does not relax the authentication requirement.
 *
 * End-to-end steps:
 *
 * 1. Register a member user through /auth/memberUser/join, which also
 *    authenticates the connection as that member (Authorization header is
 *    automatically attached by the SDK).
 * 2. Register an admin user through /auth/adminUser/join and create a system
 *    setting via /todoApp/adminUser/systemSettings to emulate a production-like
 *    environment where global configuration exists.
 * 3. While authenticated as the member user, call GET
 *    /todoApp/memberUser/actors/current and verify:
 *
 *    - Response conforms to ITodoAppActorCurrent.
 *    - ActorKind is "memberUser".
 *    - MemberUser summary is present and matches the joined member.
 *    - AdminUser and guestUser summaries are null.
 * 4. Still as the authenticated member, create a todo via POST
 *    /todoApp/memberUser/todos to prove that normal member-only operations work
 *    and the auth context is valid.
 * 5. Create a new connection object that has the same host/options as the original
 *    but an empty headers object, representing an unauthenticated client. Do
 *    not mutate headers after creation.
 * 6. Using this unauthenticated connection, attempt GET
 *    /todoApp/memberUser/actors/current inside TestValidator.error with an
 *    async callback, asserting that an error is thrown (without checking exact
 *    HTTP status codes) and therefore no ITodoAppActorCurrent is returned to
 *    unauthenticated callers.
 */
export async function test_api_actor_current_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user.
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    displayName: RandomGenerator.name(1),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ITodoAppMemberUser.IAuthorized>(memberAuthorized);

  // Snapshot member summary expectations for later comparison.
  const expectedMemberId = memberAuthorized.id;
  const expectedMemberEmail = memberAuthorized.email;
  const expectedMemberDisplayName = memberAuthorized.display_name ?? null;

  // 2. Register an admin user and create a system setting as that admin.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(1),
    status: "active",
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminAuthorized);

  const systemSettingBody = {
    key: "max_active_todos_per_user",
    value: "100",
    type: "int",
    description: "Maximum number of active todos allowed per member user.",
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const setting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert<ITodoAppSystemSetting>(setting);

  // 3. Switch back to the member user by logging in, ensuring member context.
  const memberLoginBody = {
    email: expectedMemberEmail,
    password: memberJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserLogin.ICreate;

  const memberLoggedIn: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ITodoAppMemberUser.IAuthorized>(memberLoggedIn);

  // 4. As authenticated member, load the current actor.
  const currentActor: ITodoAppActorCurrent =
    await api.functional.todoApp.memberUser.actors.current.at(connection);
  typia.assert<ITodoAppActorCurrent>(currentActor);

  // Validate unified actor representation.
  TestValidator.equals<IETodoAppActorKind, IETodoAppActorKind>(
    "actorKind value",
    currentActor.actorKind,
    "memberUser",
  );

  TestValidator.predicate(
    "memberUser summary must be present",
    currentActor.memberUser !== null,
  );
  TestValidator.predicate(
    "adminUser summary must be null for member actor",
    currentActor.adminUser === null,
  );
  TestValidator.predicate(
    "guestUser summary must be null for member actor",
    currentActor.guestUser === null,
  );

  if (currentActor.memberUser !== null) {
    TestValidator.equals(
      "memberUser id should match authorized member id",
      currentActor.memberUser.id,
      expectedMemberId,
    );
    TestValidator.equals(
      "memberUser email should match authorized member email",
      currentActor.memberUser.email,
      expectedMemberEmail,
    );
    if (expectedMemberDisplayName !== null) {
      TestValidator.equals(
        "memberUser display_name should match when present",
        currentActor.memberUser.display_name,
        expectedMemberDisplayName,
      );
    }
  }

  // 5. As the same member, create a todo to confirm member-only flows.
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: null,
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const todo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert<ITodoAppTodo>(todo);

  TestValidator.equals(
    "created todo owner id must match member id",
    todo.memberUser.id,
    expectedMemberId,
  );

  // 6. Build an unauthenticated connection (no Authorization header).
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 7. Ensure unauthenticated GET /actors/current fails with an error.
  await TestValidator.error(
    "unauthenticated actor current call must fail",
    async () => {
      await api.functional.todoApp.memberUser.actors.current.at(
        unauthenticated,
      );
    },
  );
}
