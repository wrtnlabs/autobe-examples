import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";

/**
 * Validate cross-admin detail view for todoAdmin accounts.
 *
 * This E2E test verifies that an authenticated todoAdmin can retrieve another
 * administrator's account record using the GET
 * /todoApp/todoAdmin/todoAdmins/{todoAdminId} endpoint, and that the returned
 * structure matches ITodoAppTodoAdmin without exposing any credential-related
 * data.
 *
 * Business and workflow steps:
 *
 * 1. Register the first admin (adminA) via POST /auth/todoAdmin/join. This creates
 *    an administrative account and establishes an authenticated todoAdmin
 *    session (Authorization header is set to adminA's token).
 * 2. While authenticated as adminA, create a baseline Todo status via POST
 *    /todoApp/todoAdmin/todoStatuses to ensure that privileged admin-only write
 *    operations work correctly and that the status catalogue is initialized.
 * 3. Register a second admin (adminB) via POST /auth/todoAdmin/join. The
 *    Authorization header is now associated with adminB, who will act as the
 *    viewing administrator in this test.
 * 4. Call GET /todoApp/todoAdmin/todoAdmins/{todoAdminId} with the path parameter
 *    set to adminA.id while authenticated as adminB, exercising a cross-admin
 *    detail view.
 * 5. Assert that the response is a valid ITodoAppTodoAdmin instance, that the id
 *    and email fields correspond to adminA (not adminB), and that lifecycle
 *    fields such as status, created_at, and updated_at are present and
 *    non-empty, implicitly confirming that no credential hashes are exposed.
 */
export async function test_api_todoadmin_detail_view_for_another_admin(
  connection: api.IConnection,
) {
  // 1. Register first admin (adminA) who will be the TARGET of the detail view.
  const adminAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminA = await api.functional.auth.todoAdmin.join(connection, {
    body: adminAJoinBody,
  });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(adminA);

  // 2. While authenticated as adminA, create a baseline Todo status.
  const statusBody = {
    code: `ACTIVE_${RandomGenerator.alphaNumeric(6)}`,
    label: "Active",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "core",
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const createdStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusBody,
    });
  typia.assert<ITodoAppTodoStatus>(createdStatus);

  // 3. Register second admin (adminB) who will be the VIEWER of adminA's details.
  const adminBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminB = await api.functional.auth.todoAdmin.join(connection, {
    body: adminBJoinBody,
  });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(adminB);

  // 4. Using adminB's authentication context, fetch details of adminA.
  const fetchedAdminA = await api.functional.todoApp.todoAdmin.todoAdmins.at(
    connection,
    {
      todoAdminId: adminA.id,
    },
  );
  typia.assert<ITodoAppTodoAdmin>(fetchedAdminA);

  // 5. Validate that the fetched record is adminA (not adminB) and that
  //    lifecycle fields look reasonable.
  TestValidator.equals(
    "fetched admin id should equal adminA id",
    fetchedAdminA.id,
    adminA.id,
  );

  TestValidator.equals(
    "fetched admin email should equal adminA email",
    fetchedAdminA.email,
    adminA.email,
  );

  TestValidator.predicate(
    "status should be a non-empty string",
    fetchedAdminA.status.length > 0,
  );

  TestValidator.predicate(
    "created_at should be a non-empty string",
    fetchedAdminA.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at should be a non-empty string",
    fetchedAdminA.updated_at.length > 0,
  );
}
