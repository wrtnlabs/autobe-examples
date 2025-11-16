import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";

/**
 * Validate that a todoAdmin can view their own administrative account details.
 *
 * Business context:
 *
 * - TodoAdmin actors are privileged administrators for the Todo application.
 * - When a new admin joins via /auth/todoAdmin/join, they receive an
 *   ITodoAppTodoAdmin.IAuthorized payload plus JWT tokens that the SDK
 *   automatically wires into the connection headers.
 * - Authenticated todoAdmin actors can manage catalogue data like
 *   todo_app_todo_statuses and can also retrieve admin account records via
 *   /todoApp/todoAdmin/todoAdmins/{todoAdminId}.
 *
 * This test ensures that:
 *
 * 1. A new admin can join successfully.
 * 2. As that authenticated admin, they can create at least one Todo status.
 * 3. Using their own id, they can fetch their admin detail record.
 * 4. The detail record matches the identity from the join response and exposes
 *    only non-credential fields per ITodoAppTodoAdmin.
 *
 * Steps:
 *
 * 1. Call POST /auth/todoAdmin/join with a realistic
 *    ITodoAppTodoAdminJoin.IRequest payload (email, password, optional
 *    displayName, href, referrer). Allow ip to be null since the backend can
 *    infer it.
 * 2. Receive ITodoAppTodoAdmin.IAuthorized and assert its shape with typia.assert.
 * 3. While the connection now carries the access token (set by join), call POST
 *    /todoApp/todoAdmin/todoStatuses with an ITodoAppTodoStatus.ICreate body to
 *    create a status (e.g., code "ACTIVE", label "Active"). Assert the
 *    ITodoAppTodoStatus response.
 * 4. Call GET /todoApp/todoAdmin/todoAdmins/{todoAdminId} using the id from the
 *    authorized admin payload.
 * 5. Assert that the returned ITodoAppTodoAdmin matches the identity from the join
 *    response:
 *
 *    - Id is equal
 *    - Email is equal
 *    - Status is a non-empty string
 *    - Created_at and updated_at are non-empty ISO date-time strings
 *
 * No error or negative scenarios are required; focus purely on the successful
 * self-detail retrieval path.
 */
export async function test_api_todoadmin_detail_view_by_self_admin(
  connection: api.IConnection,
) {
  // 1. Register a new todoAdmin via /auth/todoAdmin/join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const authorizedAdmin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(authorizedAdmin);

  // 2. Create at least one Todo status while authenticated as this admin
  const statusBody = {
    code: "ACTIVE",
    label: "Active",
    description:
      "Active todos are currently in progress or pending completion.",
    group: "core",
    sort_order: 1 as number & tags.Type<"int32">,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const createdStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusBody,
    });
  typia.assert<ITodoAppTodoStatus>(createdStatus);

  // 3. Fetch the admin detail using their own id
  const adminDetail: ITodoAppTodoAdmin =
    await api.functional.todoApp.todoAdmin.todoAdmins.at(connection, {
      todoAdminId: authorizedAdmin.id,
    });
  typia.assert<ITodoAppTodoAdmin>(adminDetail);

  // 4. Business-level assertions comparing join vs detail response
  TestValidator.equals(
    "admin id from join must match detail view",
    adminDetail.id,
    authorizedAdmin.id,
  );

  TestValidator.equals(
    "admin email from join must match detail view",
    adminDetail.email,
    authorizedAdmin.email,
  );

  TestValidator.predicate(
    "admin status in detail view must be a non-empty string",
    adminDetail.status.length > 0,
  );

  TestValidator.predicate(
    "admin created_at must be a non-empty date-time string",
    adminDetail.created_at.length > 0,
  );

  TestValidator.predicate(
    "admin updated_at must be a non-empty date-time string",
    adminDetail.updated_at.length > 0,
  );
}
