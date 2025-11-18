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

export async function test_api_member_user_status_update_id_not_found(
  connection: api.IConnection,
) {
  // 1. Join an admin user to obtain adminUser authentication context.
  const adminJoinBody = typia.random<ITodoAppAdminUser.IJoin>();
  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Fetch baseline member user list (first page) as admin.
  const baselineRequestBody = {
    page: 1,
    limit: 20,
  } satisfies ITodoAppMemberUser.IRequest;
  const baselinePage: IPageITodoAppMemberUser.ISummary =
    await api.functional.todoApp.adminUser.memberUsers.index(connection, {
      body: baselineRequestBody,
    });
  typia.assert(baselinePage);

  const baselinePagination = baselinePage.pagination;
  const baselineData = baselinePage.data;

  // 3. Generate a UUID that does not match any existing member user id
  //    from the baseline page. Retry a few times just in case.
  const existingIds = baselineData.map((m) => m.id);
  let nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const maxAttempts = 10;
  for (let attempt = 0; attempt < maxAttempts; ++attempt) {
    if (!existingIds.includes(nonExistentId)) break;
    nonExistentId = typia.random<string & tags.Format<"uuid">>();
  }

  // 4. Attempt to update status for the non-existent memberUserId.
  const updateBody = {
    status: "blocked",
  } satisfies ITodoAppMemberUserStatus.IUpdate;

  await TestValidator.error(
    "updating status for non-existent member user id must throw",
    async () => {
      await api.functional.todoApp.adminUser.memberUsers.status.update(
        connection,
        {
          memberUserId: nonExistentId,
          body: updateBody,
        },
      );
    },
  );

  // 5. Fetch member user list again after the failed update attempt.
  const afterPage: IPageITodoAppMemberUser.ISummary =
    await api.functional.todoApp.adminUser.memberUsers.index(connection, {
      body: baselineRequestBody,
    });
  typia.assert(afterPage);

  const afterPagination = afterPage.pagination;
  const afterData = afterPage.data;

  // 6. Validate that pagination metadata is unchanged.
  TestValidator.equals(
    "pagination current page should remain unchanged after failed status update",
    afterPagination.current,
    baselinePagination.current,
  );
  TestValidator.equals(
    "pagination limit should remain unchanged after failed status update",
    afterPagination.limit,
    baselinePagination.limit,
  );
  TestValidator.equals(
    "pagination records count should remain unchanged after failed status update",
    afterPagination.records,
    baselinePagination.records,
  );
  TestValidator.equals(
    "pagination pages count should remain unchanged after failed status update",
    afterPagination.pages,
    baselinePagination.pages,
  );

  // 7. Validate that the list of member users is unchanged.
  TestValidator.equals(
    "member user list length should remain unchanged after failed status update",
    afterData.length,
    baselineData.length,
  );

  for (let i = 0; i < baselineData.length; ++i) {
    const before = baselineData[i];
    const after = afterData[i];

    TestValidator.equals(
      `member user summary at index ${i} should remain unchanged after failed status update`,
      after,
      before,
    );
  }
}
