import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberUser";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserStatus";

/**
 * Verify that an authenticated admin can update a member user status to
 * "blocked" and that the change is correctly reflected and persisted on
 * subsequent reads.
 *
 * Business flow:
 *
 * 1. Register and authenticate an admin user via POST /auth/adminUser/join
 *    (ITodoAppAdminUser.IJoin -> IAuthorized).
 * 2. Search member users via PATCH /todoApp/adminUser/memberUsers
 *    (ITodoAppMemberUser.IRequest) and pick one member.
 * 3. Load the full member entity via GET
 *    /todoApp/adminUser/memberUsers/{memberUserId}.
 * 4. Call PUT /todoApp/adminUser/memberUsers/{memberUserId}/status with
 *    ITodoAppMemberUserStatus.IUpdate setting status to "blocked".
 * 5. Assert that the returned ITodoAppMemberUser has same id/email, status ===
 *    "blocked", and updated_at changed.
 * 6. Re-read the member via GET and verify status persists as "blocked" and core
 *    identity fields remain unchanged.
 */
export async function test_api_member_user_status_update_to_blocked(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin user
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/join",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const admin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Search member users and pick one
  const searchBody = {
    page: 1,
    limit: 10,
  } satisfies ITodoAppMemberUser.IRequest;

  const page: IPageITodoAppMemberUser.ISummary =
    await api.functional.todoApp.adminUser.memberUsers.index(connection, {
      body: searchBody,
    });
  typia.assert(page);

  TestValidator.predicate(
    "member user search should return at least one record",
    page.pagination.records > 0 && page.data.length > 0,
  );

  const summary: ITodoAppMemberUser.ISummary = page.data[0];

  // 3. Load full member entity
  const before: ITodoAppMemberUser =
    await api.functional.todoApp.adminUser.memberUsers.at(connection, {
      memberUserId: summary.id,
    });
  typia.assert(before);

  // 4. Update status to "blocked"
  const updateBody = {
    status: "blocked",
  } satisfies ITodoAppMemberUserStatus.IUpdate;

  const updated: ITodoAppMemberUser =
    await api.functional.todoApp.adminUser.memberUsers.status.update(
      connection,
      {
        memberUserId: before.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 5. Validate updated member fields
  TestValidator.equals(
    "updated member id should remain unchanged",
    updated.id,
    before.id,
  );
  TestValidator.equals(
    "updated member email should remain unchanged",
    updated.email,
    before.email,
  );
  TestValidator.equals(
    "updated member status should be blocked",
    updated.status,
    "blocked",
  );
  TestValidator.predicate(
    "updated_at should be refreshed after status update",
    updated.updated_at !== before.updated_at,
  );

  // 6. Re-read and verify persistence
  const reloaded: ITodoAppMemberUser =
    await api.functional.todoApp.adminUser.memberUsers.at(connection, {
      memberUserId: before.id,
    });
  typia.assert(reloaded);

  TestValidator.equals(
    "reloaded member id should match original",
    reloaded.id,
    before.id,
  );
  TestValidator.equals(
    "reloaded member email should match original",
    reloaded.email,
    before.email,
  );
  TestValidator.equals(
    "reloaded member status should remain blocked",
    reloaded.status,
    "blocked",
  );
  TestValidator.predicate(
    "reloaded updated_at should be at least as new as updated.updated_at",
    reloaded.updated_at === updated.updated_at,
  );
}
