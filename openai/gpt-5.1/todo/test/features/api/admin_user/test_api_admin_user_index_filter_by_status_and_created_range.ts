import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdminuser";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

export async function test_api_admin_user_index_filter_by_status_and_created_range(
  connection: api.IConnection,
) {
  // 1. Register Admin A (operator) via POST /auth/adminUser/join
  const adminAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminA: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminA);

  // 2. Register Admin B via POST /auth/adminUser/join
  const adminBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminB: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminB);

  // Ensure we have stable created_at from adminB
  const adminBCreatedAt: string & tags.Format<"date-time"> = adminB.created_at;

  // 3. Update Admin B status to a non-active lifecycle value using PUT /todoApp/adminUser/adminUsers/{adminUserId}
  //    We'll use a literal status string distinct from any default like "disabled".
  const disabledStatus = "disabled";

  const updatedAdminB: ITodoAppAdminUser =
    await api.functional.todoApp.adminUser.adminUsers.update(connection, {
      adminUserId: adminB.id,
      body: {
        status: disabledStatus,
      } satisfies ITodoAppAdminUser.IUpdate,
    });
  typia.assert<ITodoAppAdminUser>(updatedAdminB);

  TestValidator.equals(
    "updated admin B status should be disabled",
    updatedAdminB.status,
    disabledStatus,
  );

  // 4. Build created_at range around Admin B's created_at
  const createdAtDate = new Date(adminBCreatedAt);

  const createdFrom = new Date(
    createdAtDate.getTime() - 5 * 60 * 1000,
  ).toISOString();
  const createdTo = new Date(
    createdAtDate.getTime() + 5 * 60 * 1000,
  ).toISOString();

  const requestBody = {
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    keyword: null,
    status: disabledStatus,
    created_from: createdFrom,
    created_to: createdTo,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies ITodoAppAdminUser.IRequest;

  // 5. Call PATCH /todoApp/adminUser/adminUsers with filters
  const page: IPageITodoAppAdminuser.ISummary =
    await api.functional.todoApp.adminUser.adminUsers.index(connection, {
      body: requestBody,
    });
  typia.assert<IPageITodoAppAdminuser.ISummary>(page);

  const pagination = page.pagination;
  const data = page.data;

  // 6. Basic pagination invariants
  TestValidator.predicate(
    "pagination current should be within pages",
    () => pagination.current >= 0 && pagination.current < pagination.pages,
  );

  TestValidator.predicate(
    "pagination records equals data length when single-page result",
    () =>
      (pagination.pages === 0 &&
        pagination.records === 0 &&
        data.length === 0) ||
      (pagination.pages >= 1 && pagination.records >= data.length),
  );

  // 7. Verify Admin B is included and matches filters
  const foundAdminB = data.find((summary) => summary.id === updatedAdminB.id);

  TestValidator.predicate(
    "admin B should appear in filtered results",
    () => foundAdminB !== undefined,
  );

  if (foundAdminB !== undefined) {
    TestValidator.equals(
      "admin B status should match disabled filter",
      foundAdminB.status,
      disabledStatus,
    );

    TestValidator.predicate(
      "admin B created_at should be within range",
      () =>
        foundAdminB.created_at >= createdFrom &&
        foundAdminB.created_at <= createdTo,
    );
  }

  // 8. Ensure no result violates the filters
  for (const summary of data) {
    TestValidator.equals(
      "every returned admin should have disabled status",
      summary.status,
      disabledStatus,
    );

    TestValidator.predicate(
      "every returned admin created_at should be within specified range",
      () =>
        summary.created_at >= createdFrom && summary.created_at <= createdTo,
    );
  }
}
