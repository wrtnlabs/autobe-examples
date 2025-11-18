import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdminUser";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

export async function test_api_admin_adminusers_search_by_created_at_range(
  connection: api.IConnection,
) {
  // 1. Create a system setting to initialize environment
  const systemSettingKeyPrefix: string = RandomGenerator.alphaNumeric(8);
  const systemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: {
        key: `${systemSettingKeyPrefix}_max_active_todos_per_user`,
        value: "100",
        type: "int",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        group: "limits",
        enabled: true,
      } satisfies ITodoAppSystemSetting.ICreate,
    });
  typia.assert(systemSetting);

  // Helper to join an adminUser and capture its authorized payload
  const joinAdmin = async (): Promise<ITodoAppAdminUser.IAuthorized> => {
    const email: string & tags.Format<"email"> = typia.random<
      string & tags.Format<"email">
    >();
    const password: string & tags.Format<"password"> = typia.random<
      string & tags.Format<"password">
    >();

    const authorized = await api.functional.auth.adminUser.join(connection, {
      body: {
        email,
        password,
        display_name: RandomGenerator.name(),
        status: "active",
        ip: "127.0.0.1",
        href: "https://admin.todo-app.test/register",
        referrer: "https://admin.todo-app.test/landing",
      } satisfies ITodoAppAdminUser.IJoin,
    });
    typia.assert(authorized);
    return authorized;
  };

  // 2~5. Create three admin users at different times
  const firstAdmin: ITodoAppAdminUser.IAuthorized = await joinAdmin();
  const secondAdmin: ITodoAppAdminUser.IAuthorized = await joinAdmin();
  const thirdAdmin: ITodoAppAdminUser.IAuthorized = await joinAdmin();

  // Collect their created_at values and IDs
  const admins = [firstAdmin, secondAdmin, thirdAdmin];

  type AdminCreatedInfo = {
    id: string & tags.Format<"uuid">;
    created_at: string & tags.Format<"date-time">;
  };

  const createdInfos: AdminCreatedInfo[] = admins.map((admin) => ({
    id: admin.id,
    created_at: admin.created_at,
  }));

  // Sort admins by created_at lexicographically (ISO date-time is lex-orderable)
  const sortedByCreatedAt: AdminCreatedInfo[] = [...createdInfos].sort(
    (a, b) =>
      a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0,
  );

  const earliest = sortedByCreatedAt[0];
  const middle = sortedByCreatedAt[1];
  const latest = sortedByCreatedAt[2];

  const createdFrom: string & tags.Format<"date-time"> = middle.created_at;
  const createdTo: string & tags.Format<"date-time"> = latest.created_at;

  // 7. Build search request with createdAt range filter
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 20 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const requestBody = {
    page,
    limit,
    orderByCreatedAt: "asc" as const,
    createdFrom,
    createdTo,
  } satisfies ITodoAppAdminUser.IRequest;

  const firstPage: IPageITodoAppAdminUser.ISummary =
    await api.functional.todoApp.adminUser.adminUsers.index(connection, {
      body: requestBody,
    });
  typia.assert(firstPage);

  // 8. Validate pagination metadata
  const pagination = firstPage.pagination;
  TestValidator.equals(
    "pagination current page should match request page",
    pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit should match request limit",
    pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "records should be >= number of returned admin users",
    pagination.records >= firstPage.data.length,
  );
  TestValidator.predicate("pages should be at least 1", pagination.pages >= 1);

  // Helper to check if created_at is within [from, to] inclusive
  const isWithinRange = (
    value: string & tags.Format<"date-time">,
    from: string & tags.Format<"date-time">,
    to: string & tags.Format<"date-time">,
  ): boolean => value >= from && value <= to;

  // Validate every result row's created_at is within [createdFrom, createdTo]
  for (const summary of firstPage.data) {
    TestValidator.predicate(
      "every returned admin's created_at lies within the specified range",
      isWithinRange(summary.created_at, createdFrom, createdTo),
    );
  }

  const resultIds = firstPage.data.map((s) => s.id);

  // Confirm earliest admin is excluded only when its created_at is strictly before createdFrom
  if (earliest.created_at < createdFrom) {
    TestValidator.predicate(
      "earliest admin should not appear when filtering from middle to latest",
      resultIds.includes(earliest.id) === false,
    );
  }

  TestValidator.predicate(
    "at least one of middle or latest admins should appear in the filtered results",
    resultIds.includes(middle.id) || resultIds.includes(latest.id),
  );

  // 9. Stability check: call the same request again and compare data arrays
  const secondPage: IPageITodoAppAdminUser.ISummary =
    await api.functional.todoApp.adminUser.adminUsers.index(connection, {
      body: requestBody,
    });
  typia.assert(secondPage);

  TestValidator.equals(
    "subsequent search with identical filter should return the same admin list",
    secondPage.data,
    firstPage.data,
  );
}
