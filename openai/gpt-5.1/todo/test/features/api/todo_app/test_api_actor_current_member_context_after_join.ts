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
 * Validate memberUser actor context immediately after self-registration.
 *
 * This test ensures that when a new member user joins the todoApp service
 * through the memberUser join endpoint, the unified actor endpoint
 * `/todoApp/memberUser/actors/current` correctly resolves that session as a
 * `memberUser` actor. It also verifies that the member context can be used for
 * normal business operations, and that unauthenticated access to
 * `/actors/current` is rejected.
 *
 * Workflow:
 *
 * 1. Self-register a new member user using POST /auth/memberUser/join.
 * 2. Using the authenticated member context (token set by SDK), create a simple
 *    todo via POST /todoApp/memberUser/todos.
 * 3. Call GET /todoApp/memberUser/actors/current and assert that:
 *
 *    - ActorKind is `"memberUser"`.
 *    - MemberUser is non-null and its id, email, status, created_at match the joined
 *         member summary.
 *    - AdminUser and guestUser are null.
 * 4. Create an unauthenticated connection and confirm that calling /actors/current
 *    without credentials results in an authentication error.
 */
export async function test_api_actor_current_member_context_after_join(
  connection: api.IConnection,
) {
  // 1. Register a new member user (join)
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    displayName: RandomGenerator.name(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const joinedMember: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(joinedMember);

  // 2. Create a simple todo as the joined member to confirm business context
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: null,
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(createdTodo);

  // Ensure the todo belongs to the joined member
  TestValidator.equals(
    "created todo must belong to joined member",
    createdTodo.memberUser.id,
    joinedMember.id,
  );

  // 3. Fetch current actor as memberUser
  const actorCurrent: ITodoAppActorCurrent =
    await api.functional.todoApp.memberUser.actors.current.at(connection);
  typia.assert(actorCurrent);

  // Validate that actorKind is memberUser
  TestValidator.equals(
    "actorKind equals memberUser",
    actorCurrent.actorKind,
    "memberUser" as IETodoAppActorKind,
  );

  // Validate memberUser summary matches joined member basic info
  TestValidator.predicate(
    "memberUser summary must not be null",
    actorCurrent.memberUser !== null,
  );

  if (actorCurrent.memberUser !== null) {
    TestValidator.equals(
      "member summary id must match joined member id",
      actorCurrent.memberUser.id,
      joinedMember.id,
    );
    TestValidator.equals(
      "member summary email must match joined member email",
      actorCurrent.memberUser.email,
      joinedMember.email,
    );
    TestValidator.equals(
      "member summary status must match joined member status",
      actorCurrent.memberUser.status,
      joinedMember.status,
    );
    TestValidator.equals(
      "member summary created_at must match joined member created_at",
      actorCurrent.memberUser.created_at,
      joinedMember.created_at,
    );
  }

  // Ensure adminUser and guestUser are null
  TestValidator.equals(
    "adminUser summary must be null for memberUser actor",
    actorCurrent.adminUser,
    null,
  );
  TestValidator.equals(
    "guestUser summary must be null for memberUser actor",
    actorCurrent.guestUser,
    null,
  );

  // 4. Unauthenticated access should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated /actors/current must fail",
    async () => {
      await api.functional.todoApp.memberUser.actors.current.at(unauthConn);
    },
  );
}
