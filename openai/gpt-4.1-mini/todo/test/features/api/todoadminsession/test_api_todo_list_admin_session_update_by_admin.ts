import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";

/**
 * Test updating an existing Todo List admin session record, including modifying
 * connection IP, URL, referrer, and expiration time. The test ensures only
 * authorized admins can update sessions, that sessions must be first created,
 * and that updated data reflects accurately. Validates update endpoint behavior
 * and authorization enforcement.
 */
export async function test_api_todo_list_admin_session_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a new admin user
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "p@ssword123";
  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a new admin session for this admin
  const sessionCreateBody = {
    ip: `${RandomGenerator.pick(["192", "10", "172"])}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}`,
    href: `https://example.com/todo/admin/${RandomGenerator.alphaNumeric(6)}`,
    referrer: `https://example.com/login?session=${RandomGenerator.alphaNumeric(5)}`,
    expired_at: new Date(Date.now() + 3600 * 1000).toISOString(),
  } satisfies ITodoListAdminSession.ICreate;

  const session: ITodoListAdminSession =
    await api.functional.todoList.admin.todoListAdmins.todoListAdminSessions.create(
      connection,
      {
        todoListAdminId: admin.id,
        body: sessionCreateBody,
      },
    );
  typia.assert(session);

  // Step 3: Prepare an updated session patch
  const ipSegments = [...sessionCreateBody.ip.split(".")];
  ipSegments[3] = ((Number(ipSegments[3]) + 1) % 256) + "";
  const updatedSessionBody = {
    ip: ipSegments.join("."),
    href: `https://example.com/admin/dashboard/${RandomGenerator.alphaNumeric(8)}`,
    referrer: `https://example.com/admin?ref=${RandomGenerator.alphaNumeric(7)}`,
    expired_at: new Date(Date.now() + 7200 * 1000).toISOString(),
  } satisfies ITodoListAdminSession.IUpdate;

  // Step 4: Update the existing session record
  const updatedSession: ITodoListAdminSession =
    await api.functional.todoList.admin.todoListAdmins.todoListAdminSessions.update(
      connection,
      {
        todoListAdminId: admin.id,
        id: session.id,
        body: updatedSessionBody,
      },
    );
  typia.assert(updatedSession);

  // Step 5: Validate the updated session fields
  TestValidator.equals("updated session id", updatedSession.id, session.id);
  TestValidator.equals(
    "updated session todoListAdminId",
    updatedSession.todoListAdminId,
    admin.id,
  );
  TestValidator.equals(
    "updated IP address",
    updatedSession.ip,
    updatedSessionBody.ip,
  );
  TestValidator.equals(
    "updated href",
    updatedSession.href,
    updatedSessionBody.href,
  );
  TestValidator.equals(
    "updated referrer",
    updatedSession.referrer,
    updatedSessionBody.referrer,
  );
  TestValidator.equals(
    "updated expiration",
    updatedSession.expired_at,
    updatedSessionBody.expired_at,
  );

  // Step 6: Attempt to update a session with an unauthorized admin
  // Create another admin user
  const otherAdminEmail: string = typia.random<string & tags.Format<"email">>();
  const otherAdminPassword = "diffP@ssw0rd";

  const otherAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: otherAdminEmail,
        password: otherAdminPassword,
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(otherAdmin);

  // Attempt update by other admin, expecting an authorization error
  await TestValidator.error(
    "unauthorized update of session should fail",
    async () => {
      await api.functional.todoList.admin.todoListAdmins.todoListAdminSessions.update(
        connection,
        {
          todoListAdminId: admin.id,
          id: session.id,
          body: {
            ip: "127.0.0.1",
          } satisfies ITodoListAdminSession.IUpdate,
        },
      );
    },
  );
}
