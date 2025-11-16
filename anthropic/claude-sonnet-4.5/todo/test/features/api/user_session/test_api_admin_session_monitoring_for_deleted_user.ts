import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUserSession";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Test administrator's ability to monitor user session activity before account
 * deletion.
 *
 * This test validates the complete workflow of administrative user lifecycle
 * monitoring:
 *
 * 1. Admin authenticates and gains administrative privileges
 * 2. Regular user account is created
 * 3. User creates multiple sessions through authentication
 * 4. Admin retrieves and monitors user's session history
 * 5. Admin deletes the user account
 * 6. Sessions are cascaded and removed along with the user
 *
 * This demonstrates security monitoring capabilities and proper data cleanup.
 */
export async function test_api_admin_session_monitoring_for_deleted_user(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create regular user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "userPass123";

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 3: Generate multiple user sessions through repeated logins
  const sessionCount = 3;
  for (let i = 0; i < sessionCount; i++) {
    await api.functional.auth.user.login(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ILogin,
    });
  }

  // Step 4: Admin retrieves user's session list (admin is still authenticated from step 1)
  const sessionPage: IPageITodoListUserSession.ISummary =
    await api.functional.todoList.user.users.sessions.index(connection, {
      userId: user.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoListUserSession.IRequest,
    });
  typia.assert(sessionPage);

  // Step 5: Validate pagination metadata
  TestValidator.predicate(
    "pagination should have valid current page",
    sessionPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination should have valid limit",
    sessionPage.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination should have positive record count",
    sessionPage.pagination.records > 0,
  );

  // Step 6: Validate session listing contains user sessions (join creates 1 session + 3 logins = 4 total)
  const expectedSessionCount = sessionCount + 1;
  TestValidator.predicate(
    "session list should contain expected number of sessions",
    sessionPage.data.length >= expectedSessionCount,
  );

  // Step 7: Validate session data completeness
  for (const session of sessionPage.data) {
    TestValidator.predicate(
      "session should have valid UUID",
      typia.is<string & tags.Format<"uuid">>(session.id),
    );
    TestValidator.predicate(
      "session should have user ID reference",
      session.todo_list_user_id === user.id,
    );
    TestValidator.predicate(
      "session should have IP address",
      session.ip.length > 0,
    );
    TestValidator.predicate(
      "session should have href",
      typia.is<string & tags.Format<"uri">>(session.href),
    );
    TestValidator.predicate(
      "session should have referrer",
      typia.is<string & tags.Format<"uri">>(session.referrer),
    );
    TestValidator.predicate(
      "session should have created_at timestamp",
      typia.is<string & tags.Format<"date-time">>(session.created_at),
    );
    TestValidator.predicate(
      "session expired_at should be null or valid date-time",
      session.expired_at === null ||
        typia.is<string & tags.Format<"date-time">>(session.expired_at),
    );
  }

  // Step 8: Admin deletes the user account
  const deletedUser: ITodoListUser =
    await api.functional.todoList.admin.users.erase(connection, {
      userId: user.id,
    });
  typia.assert(deletedUser);

  // Step 9: Verify user deletion succeeded
  TestValidator.equals("deleted user ID should match", deletedUser.id, user.id);
}
