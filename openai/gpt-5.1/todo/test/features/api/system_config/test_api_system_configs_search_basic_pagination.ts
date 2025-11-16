import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSystemConfig";
import type { ITodoAppSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemConfig";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";

export async function test_api_system_configs_search_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Register a new todoAdmin and obtain authenticated context
  const joinRequest = typia.random<ITodoAppTodoAdminJoin.IRequest>();

  const admin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(admin);

  // 2. Seed multiple system configuration entries under a common scope
  const scope = "todo";
  const seedConfigs: ITodoAppSystemConfig[] = [];

  const createConfig = async (key: string, value: string): Promise<void> => {
    const created: ITodoAppSystemConfig =
      await api.functional.todoApp.todoAdmin.systemConfigs.create(connection, {
        body: {
          scope,
          key,
          value,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          is_active: true,
        } satisfies ITodoAppSystemConfig.ICreate,
      });
    typia.assert<ITodoAppSystemConfig>(created);
    seedConfigs.push(created);
  };

  await createConfig("deletion_model", "soft_delete");
  await createConfig("soft_delete_retention_days", "30");
  await createConfig("max_open_todos_per_user", "50");

  const seededCount = seedConfigs.length;

  // 3. Call index with basic pagination: page 0, small limit, null filters
  const page = 0;
  const limit = 2;

  const requestBody = {
    page,
    limit,
    scope: null,
    key: null,
    is_active: null,
    include_deleted: null,
    order_by: null,
    order_direction: null,
  } satisfies ITodoAppSystemConfig.IRequest;

  const pageResult: IPageITodoAppSystemConfig.ISummary =
    await api.functional.todoApp.todoAdmin.systemConfigs.index(connection, {
      body: requestBody,
    });
  typia.assert<IPageITodoAppSystemConfig.ISummary>(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  const data: ITodoAppSystemConfig.ISummary[] = pageResult.data;

  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination.current should be first page (0)",
    pagination.current,
    page,
  );

  TestValidator.equals(
    "pagination.limit should match requested limit",
    pagination.limit,
    limit,
  );

  TestValidator.predicate(
    "pagination.records should be at least the number of seeded configs",
    pagination.records >= seededCount,
  );

  TestValidator.predicate(
    "pagination.pages should be at least 1 when there are any records",
    pagination.records === 0 ? pagination.pages === 0 : pagination.pages >= 1,
  );

  TestValidator.predicate(
    "current page index should be within total pages when there are records",
    pagination.records === 0
      ? pagination.current === 0
      : pagination.current < pagination.pages,
  );

  // 5. Validate data array constraints
  TestValidator.predicate(
    "data length should not exceed pagination.limit",
    data.length <= pagination.limit,
  );

  // Ensure that at least one seeded configuration appears in the current page
  const seededKeys = seedConfigs.map((c) => `${c.scope}:${c.key}`);
  const pageKeys = data.map((c) => `${c.scope}:${c.key}`);

  TestValidator.predicate(
    "at least one seeded configuration should appear in the first page when possible",
    pagination.records === 0
      ? data.length === 0
      : pageKeys.some((k) => seededKeys.includes(k)),
  );
}
