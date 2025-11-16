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

/**
 * Validate that system configuration search respects is_active and
 * include_deleted filters.
 *
 * Business goal: Ensure that the admin-facing search endpoint for
 * `todo_app_system_configs` returns only active, non-deleted configurations
 * when requested, excludes active rows when `is_active` is false, and that
 * `include_deleted` only broadens the result set rather than excluding
 * non-deleted rows.
 *
 * High level steps:
 *
 * 1. Join as a new todoAdmin so that subsequent systemConfig calls are
 *    authenticated.
 * 2. Create several system configuration entries with distinct scope/key
 *    combinations; rely on server defaults for is_active and deleted_at.
 * 3. Search with `is_active: true` and `include_deleted: false` and ensure all
 *    returned rows are active and not soft-deleted.
 * 4. Search with `is_active: false` and confirm that, because we've only created
 *    active configs, zero records are returned.
 * 5. Search with `include_deleted: true` and confirm that the dataset is at least
 *    as large as the active-only view and that deleted_at remains null for our
 *    newly created configs.
 */
export async function test_api_system_configs_search_active_vs_inactive_and_deleted(
  connection: api.IConnection,
) {
  // 1. Join as a new todoAdmin (authentication dependency).
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://admin.todoapp.example.com/join",
    referrer: "https://admin.todoapp.example.com/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create several system configuration entries.
  const createConfig = async (
    scope: string,
    key: string,
  ): Promise<ITodoAppSystemConfig> => {
    const body = {
      scope,
      key,
      value: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 2 }),
      is_active: true,
    } satisfies ITodoAppSystemConfig.ICreate;

    const config: ITodoAppSystemConfig =
      await api.functional.todoApp.todoAdmin.systemConfigs.create(connection, {
        body,
      });
    typia.assert(config);
    return config;
  };

  const configActive1 = await createConfig("todo", "feature_flag_alpha");
  const configActive2 = await createConfig("todo", "feature_flag_beta");
  const configActive3 = await createConfig("system", "retention_policy_days");

  const createdConfigs = [configActive1, configActive2, configActive3];

  // Helper to run index with arbitrary filters.
  const search = async (
    override: Partial<ITodoAppSystemConfig.IRequest>,
  ): Promise<IPageITodoAppSystemConfig.ISummary> => {
    const base: ITodoAppSystemConfig.IRequest = {
      page: 0 as number & tags.Type<"int32">,
      limit: 50 as number & tags.Type<"int32">,
      scope: null,
      key: null,
      is_active: null,
      include_deleted: null,
      order_by: null,
      order_direction: null,
    };

    const body: ITodoAppSystemConfig.IRequest = {
      ...base,
      ...override,
    };

    const pageResult: IPageITodoAppSystemConfig.ISummary =
      await api.functional.todoApp.todoAdmin.systemConfigs.index(connection, {
        body,
      });
    typia.assert(pageResult);
    return pageResult;
  };

  // 3. Search active, non-deleted configs.
  const activePage = await search({
    is_active: true,
    include_deleted: false,
  });

  const activePagination = activePage.pagination;
  const activeData = activePage.data;

  // Basic sanity checks on pagination structure.
  TestValidator.predicate(
    "active search pagination limit is positive",
    activePagination.limit > 0,
  );
  TestValidator.predicate(
    "active search records non-negative",
    activePagination.records >= 0,
  );

  // All results must be active and non-deleted.
  for (const row of activeData) {
    TestValidator.predicate(
      "row in active search is_active must be true",
      row.is_active === true,
    );
    TestValidator.predicate(
      "row in active search deleted_at must be null",
      row.deleted_at === null,
    );
  }

  // Ensure that our created configs appear in the active search (by id).
  for (const created of createdConfigs) {
    const found = activeData.find((row) => row.id === created.id);
    TestValidator.predicate(
      `created config ${created.scope}/${created.key} appears in active search`,
      !!found,
    );
  }

  // 4. Search inactive-only configs.
  const inactivePage = await search({
    is_active: false,
    include_deleted: null,
  });

  const inactivePagination = inactivePage.pagination;
  const inactiveData = inactivePage.data;

  TestValidator.equals(
    "inactive search has zero records because only active configs were created",
    inactivePagination.records,
    0,
  );
  TestValidator.equals(
    "inactive search data length is zero",
    inactiveData.length,
    0,
  );

  // 5. Search including deleted entries.
  const includeDeletedPage = await search({
    is_active: null,
    include_deleted: true,
  });

  const includeDeletedPagination = includeDeletedPage.pagination;
  const includeDeletedData = includeDeletedPage.data;

  TestValidator.predicate(
    "include_deleted search has records >= active search",
    includeDeletedPagination.records >= activePagination.records,
  );

  // Every active result should still be present when including deleted.
  for (const activeRow of activeData) {
    const found = includeDeletedData.find((row) => row.id === activeRow.id);
    TestValidator.predicate(
      `active config ${activeRow.scope}/${activeRow.key} still present when include_deleted is true`,
      !!found,
    );
  }

  // Our created configs should still be non-deleted even when include_deleted=true.
  for (const created of createdConfigs) {
    const found = includeDeletedData.find((row) => row.id === created.id);
    TestValidator.predicate(
      `created config ${created.scope}/${created.key} present in include_deleted search`,
      !!found,
    );
    if (found) {
      TestValidator.predicate(
        `created config ${created.scope}/${created.key} deleted_at is null even in include_deleted search`,
        found.deleted_at === null,
      );
    }
  }
}
