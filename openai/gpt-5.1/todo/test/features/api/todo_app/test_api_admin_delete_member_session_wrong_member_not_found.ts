import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Validate that admin session deletion with mismatched member/session
 * identifiers is safely handled and does not corrupt other users' ability to
 * operate.
 *
 * Business intent:
 *
 * - Admin-only endpoint
 *   `/todoApp/adminUser/memberUsers/{memberUserId}/sessions/{sessionId}` must
 *   strictly bind sessions to their owning member user.
 * - When an admin uses a `memberUserId` that does not match the real owner of a
 *   given `sessionId` (or the session does not exist), the system must respond
 *   in a safe, non-leaky way and must not accidentally invalidate or remove
 *   unrelated sessions.
 *
 * Constraints from the SDK surface:
 *
 * - Session internals (real `sessionId` values or a list of sessions) are not
 *   exposed via any API we can call from tests.
 * - The `erase` API returns `void` and does not surface HTTP status codes or
 *   error envelopes in its TypeScript signature.
 * - SDK functions automatically manage `connection.headers.Authorization` based
 *   on auth calls; tests must not manipulate headers manually.
 *
 * Therefore this E2E test focuses on a type-safe, observable behavior:
 *
 * - Create an admin and two separate member users (A and B).
 * - For each member, create at least one todo so we can confirm ownership and
 *   ensure their accounts and sessions are fully established.
 * - As admin, call the session erase endpoint with a mismatched pair:
 *   `memberUserId` = A.id and `sessionId` = a random UUID that does not
 *   correspond to any known session (and in particular not to A's sessions).
 * - Afterwards, confirm that member B is still able to authenticate and create
 *   new todos, demonstrating that the attempted deletion did not globally
 *   disrupt B’s ability to operate.
 */
export async function test_api_admin_delete_member_session_wrong_member_not_found(
  connection: api.IConnection,
) {
  // 1. Admin user registration (also authenticates admin and seeds Authorization)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Member user A registration (join also authenticates as member A)
  const memberAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberAPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const memberAJoinBody = {
    email: memberAEmail,
    password: memberAPassword,
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const memberAAuthorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberAAuthorized);

  const memberAId: string & tags.Format<"uuid"> = memberAAuthorized.id;

  // 3. Member A creates a todo, confirming ownership
  const todoACreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITodoAppTodo.ICreate;

  const todoA: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoACreateBody,
    });
  typia.assert(todoA);

  TestValidator.equals(
    "todo A should belong to member A",
    todoA.memberUser.id,
    memberAId,
  );

  // 4. Member user B registration (join authenticates as member B)
  const memberBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberBPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const memberBJoinBody = {
    email: memberBEmail,
    password: memberBPassword,
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const memberBAuthorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberBAuthorized);

  const memberBId: string & tags.Format<"uuid"> = memberBAuthorized.id;

  // 5. Member B creates a todo, confirming independent ownership
  const todoBCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ITodoAppTodo.ICreate;

  const todoB: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoBCreateBody,
    });
  typia.assert(todoB);

  TestValidator.equals(
    "todo B should belong to member B",
    todoB.memberUser.id,
    memberBId,
  );

  TestValidator.notEquals(
    "member A and B must be different users",
    memberAId,
    memberBId,
  );

  // 6. Prepare a random sessionId that is guaranteed not to be tied to member A
  const randomSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 7. Switch back to admin authentication using login
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    user_agent: null,
  } satisfies ITodoAppAdminUser.ILogin;

  const adminLoggedIn: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  TestValidator.equals(
    "admin login should return same admin id as join",
    adminLoggedIn.id,
    adminAuthorized.id,
  );

  // 8. As admin, attempt to delete a session using a mismatched memberUserId
  //    and an arbitrary random sessionId. The contract says the backend should
  //    treat mismatches as not-found; on the client side we only ensure that
  //    this call does not break type guarantees or prevent future operations.
  await api.functional.todoApp.adminUser.memberUsers.sessions.erase(
    connection,
    {
      memberUserId: memberAId,
      sessionId: randomSessionId,
    },
  );

  // 9. After the deletion attempt, member B should still be able to log in and
  //    create a new todo, showing that their ability to operate remains intact.
  const memberBLoginBody = {
    email: memberBEmail,
    password: memberBPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserLogin.IRequest;

  const memberBLoggedIn: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberBLoginBody,
    });
  typia.assert(memberBLoggedIn);

  TestValidator.equals(
    "member B login after erase should still reference the same member id",
    memberBLoggedIn.id,
    memberBId,
  );

  const todoBAfterEraseCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITodoAppTodo.ICreate;

  const todoBAfterErase: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoBAfterEraseCreateBody,
    });
  typia.assert(todoBAfterErase);

  TestValidator.equals(
    "member B can still create todos after mismatched session erase attempt",
    todoBAfterErase.memberUser.id,
    memberBId,
  );
}
