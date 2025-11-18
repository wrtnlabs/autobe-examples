import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberUser";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";

/**
 * Validate that an authenticated admin can permanently erase an existing active
 * member user account and that the returned representation and subsequent
 * lookups behave as expected.
 *
 * Business flow:
 *
 * 1. Register a new admin user via POST /auth/adminUser/join and obtain an
 *    authorized admin session (SDK automatically wires Authorization header).
 * 2. As the admin, search for member users with status "active" using PATCH
 *    /todoApp/adminUser/memberUsers.
 * 3. Select one active member from the page result and fetch its full details via
 *    GET /todoApp/adminUser/memberUsers/{memberUserId}.
 * 4. Erase that member using DELETE /todoApp/adminUser/memberUsers/{memberUserId}
 *    and validate that the response reflects the erased member identity.
 * 5. Attempt to fetch the same member again and assert that the call fails,
 *    confirming permanent removal.
 */
export async function test_api_member_user_erase_by_admin_active_member(
  connection: api.IConnection,
) {
  // 1. Bootstrap an admin account and session
  const adminJoinInput = typia.random<ITodoAppAdminUser.IJoin>();
  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuthorized);

  // 2. Locate at least one active member user
  const pageRequestBody = {
    page: 1,
    limit: 10,
    status: "active",
  } satisfies ITodoAppMemberUser.IRequest;

  const memberPage: IPageITodoAppMemberUser.ISummary =
    await api.functional.todoApp.adminUser.memberUsers.index(connection, {
      body: pageRequestBody,
    });
  typia.assert(memberPage);

  TestValidator.predicate(
    "there should be at least one active member to erase",
    memberPage.data.length > 0,
  );

  const targetSummary: ITodoAppMemberUser.ISummary = memberPage.data[0];

  // 3. Fetch full details before deletion and validate consistency
  const beforeErase: ITodoAppMemberUser =
    await api.functional.todoApp.adminUser.memberUsers.at(connection, {
      memberUserId: targetSummary.id,
    });
  typia.assert(beforeErase);

  TestValidator.equals(
    "member id in detail matches summary before erase",
    beforeErase.id,
    targetSummary.id,
  );
  TestValidator.equals(
    "member email in detail matches summary before erase",
    beforeErase.email,
    targetSummary.email,
  );
  TestValidator.equals(
    "member status in detail matches summary before erase",
    beforeErase.status,
    targetSummary.status,
  );

  // 4. Erase the member and check returned representation
  const erased: ITodoAppMemberUser =
    await api.functional.todoApp.adminUser.memberUsers.erase(connection, {
      memberUserId: targetSummary.id,
    });
  typia.assert(erased);

  TestValidator.equals(
    "erased member id matches original",
    erased.id,
    beforeErase.id,
  );
  TestValidator.equals(
    "erased member email matches original",
    erased.email,
    beforeErase.email,
  );
  TestValidator.equals(
    "erased member status matches original pre-deletion status",
    erased.status,
    beforeErase.status,
  );

  TestValidator.notEquals(
    "erasing member should update updated_at timestamp",
    erased.updated_at,
    beforeErase.updated_at,
  );

  // 5. Subsequent fetch must fail, confirming permanent deletion
  await TestValidator.error(
    "fetching erased member should result in an error",
    async () => {
      await api.functional.todoApp.adminUser.memberUsers.at(connection, {
        memberUserId: targetSummary.id,
      });
    },
  );
}
