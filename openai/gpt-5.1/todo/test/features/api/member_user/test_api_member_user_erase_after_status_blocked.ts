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
 * Validate that an admin can block then erase a member user in TodoApp.
 *
 * Business flow covered by this test:
 *
 * 1. Register a new admin account and establish an authenticated adminUser
 *    context.
 * 2. As the admin, search for member users and pick one candidate to operate on.
 * 3. Load the full details of that member user.
 * 4. Update the member's status to a blocked-like state via the dedicated status
 *    endpoint.
 * 5. Verify that the returned member entity reflects the new blocked status.
 * 6. Erase the blocked member account via the erase endpoint.
 * 7. Verify that erase returns the erased entity with the same id.
 * 8. Confirm that subsequent attempts to load that member by id fail.
 *
 * Notes:
 *
 * - Member creation is not part of the exposed API set, so this test assumes that
 *   at least one member user is already present in the database and focuses on
 *   the lifecycle from status change to permanent erase.
 * - We avoid asserting specific HTTP status codes and instead only assert that an
 *   error is thrown after deletion when trying to re-fetch the erased member.
 */
export async function test_api_member_user_erase_after_status_blocked(
  connection: api.IConnection,
) {
  // 1. Register an admin user to obtain an authenticated admin context
  const adminJoinBody = typia.random<ITodoAppAdminUser.IJoin>();
  const admin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(admin);

  // Ensure token structure also matches (IAuthorizationToken is part of IAuthorized)
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Search for member users as admin and obtain a candidate
  const searchRequest = {
    page: 1 as number,
    limit: 5 as number,
  } satisfies ITodoAppMemberUser.IRequest;

  const page: IPageITodoAppMemberUser.ISummary =
    await api.functional.todoApp.adminUser.memberUsers.index(connection, {
      body: searchRequest,
    });
  typia.assert<IPageITodoAppMemberUser.ISummary>(page);

  // Ensure we have at least one member user to operate on
  await TestValidator.predicate(
    "there must be at least one member user available for admin operations",
    async () => page.data.length > 0,
  );

  const targetSummary: ITodoAppMemberUser.ISummary = page.data[0];
  typia.assert<ITodoAppMemberUser.ISummary>(targetSummary);

  // 3. Load full details of the target member user
  const before: ITodoAppMemberUser =
    await api.functional.todoApp.adminUser.memberUsers.at(connection, {
      memberUserId: targetSummary.id,
    });
  typia.assert<ITodoAppMemberUser>(before);

  TestValidator.equals(
    "detail endpoint should return the same member id as summary",
    before.id,
    targetSummary.id,
  );

  // 4. Update status to a blocked state via status endpoint
  const blockedStatusValue = "blocked";
  const statusUpdateBody = {
    status: blockedStatusValue,
  } satisfies ITodoAppMemberUserStatus.IUpdate;

  const afterStatus: ITodoAppMemberUser =
    await api.functional.todoApp.adminUser.memberUsers.status.update(
      connection,
      {
        memberUserId: targetSummary.id,
        body: statusUpdateBody,
      },
    );
  typia.assert<ITodoAppMemberUser>(afterStatus);

  TestValidator.equals(
    "status update should not change member id",
    afterStatus.id,
    before.id,
  );

  TestValidator.equals(
    "member status should be updated to blocked value",
    afterStatus.status,
    blockedStatusValue,
  );

  // 5. Erase the blocked member user
  const erased: ITodoAppMemberUser =
    await api.functional.todoApp.adminUser.memberUsers.erase(connection, {
      memberUserId: targetSummary.id,
    });
  typia.assert<ITodoAppMemberUser>(erased);

  TestValidator.equals(
    "erase endpoint should return the erased member with same id",
    erased.id,
    targetSummary.id,
  );

  // 6. Confirm that subsequent GET fails after erase
  await TestValidator.error(
    "loading an erased member user by id should result in an error",
    async () => {
      await api.functional.todoApp.adminUser.memberUsers.at(connection, {
        memberUserId: targetSummary.id,
      });
    },
  );
}
