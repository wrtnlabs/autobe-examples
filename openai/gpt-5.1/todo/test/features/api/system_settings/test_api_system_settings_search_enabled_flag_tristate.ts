import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSystemSetting";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

export async function test_api_system_settings_search_enabled_flag_tristate(
  connection: api.IConnection,
) {
  // 1. Join an admin user and let SDK attach Authorization header
  const joinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.local/join",
    referrer: "https://admin.todo-app.local/",
  } satisfies ITodoAppAdminUser.IJoin;

  const admin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create two system settings: one enabled, one disabled
  const baseKeyPrefix = `e2e_tristate_${RandomGenerator.alphaNumeric(6)}`;

  const enabledCreateBody = {
    key: `${baseKeyPrefix}_enabled`,
    value: "true",
    type: "boolean",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "tristate-test",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const disabledCreateBody = {
    key: `${baseKeyPrefix}_disabled`,
    value: "false",
    type: "boolean",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "tristate-test",
    enabled: false,
  } satisfies ITodoAppSystemSetting.ICreate;

  const enabledSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: enabledCreateBody,
    });
  typia.assert(enabledSetting);

  const disabledSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: disabledCreateBody,
    });
  typia.assert(disabledSetting);

  // Sanity check: ensure created settings reflect requested enabled flags
  TestValidator.predicate(
    "created enabled/disabled settings must reflect requested flags",
    enabledSetting.enabled === true && disabledSetting.enabled === false,
  );

  // Helper to build a common base search request
  const page = 1;
  const pageSize = 50;

  const buildRequest = (
    enabled: boolean | null | undefined,
  ): ITodoAppSystemSetting.IRequest => {
    const body = {
      page,
      pageSize,
      key: baseKeyPrefix,
      group: "tristate-test",
      enabled,
      createdFrom: undefined,
      createdTo: undefined,
      updatedFrom: undefined,
      updatedTo: undefined,
      sortBy: "key",
      sortDirection: "asc" as const,
    } satisfies ITodoAppSystemSetting.IRequest;
    return body;
  };

  // 3. Search with enabled=true
  const enabledIndexResponse: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.adminUser.systemSettings.index(connection, {
      body: buildRequest(true),
    });
  typia.assert(enabledIndexResponse);

  TestValidator.predicate(
    "enabled=true search should return only enabled settings",
    enabledIndexResponse.data.every((s) => s.enabled === true),
  );

  const enabledIds = enabledIndexResponse.data.map((s) => s.id);

  TestValidator.predicate(
    "enabled=true result should include the created enabled setting",
    enabledIds.includes(enabledSetting.id),
  );

  TestValidator.predicate(
    "enabled=true result should NOT include the created disabled setting",
    !enabledIds.includes(disabledSetting.id),
  );

  const enabledPagination = enabledIndexResponse.pagination;

  // 4. Search with enabled=false
  const disabledIndexResponse: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.adminUser.systemSettings.index(connection, {
      body: buildRequest(false),
    });
  typia.assert(disabledIndexResponse);

  TestValidator.predicate(
    "enabled=false search should return only disabled settings",
    disabledIndexResponse.data.every((s) => s.enabled === false),
  );

  const disabledIds = disabledIndexResponse.data.map((s) => s.id);

  TestValidator.predicate(
    "enabled=false result should include the created disabled setting",
    disabledIds.includes(disabledSetting.id),
  );

  TestValidator.predicate(
    "enabled=false result should NOT include the created enabled setting",
    !disabledIds.includes(enabledSetting.id),
  );

  const disabledPagination = disabledIndexResponse.pagination;

  // 5. Search with enabled=null (no filter)
  const tristateIndexResponse: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.adminUser.systemSettings.index(connection, {
      body: buildRequest(null),
    });
  typia.assert(tristateIndexResponse);

  const tristateIds = tristateIndexResponse.data.map((s) => s.id);

  TestValidator.predicate(
    "unfiltered search should include the enabled setting",
    tristateIds.includes(enabledSetting.id),
  );

  TestValidator.predicate(
    "unfiltered search should include the disabled setting",
    tristateIds.includes(disabledSetting.id),
  );

  // 6. Basic pagination consistency checks
  const tristatePagination = tristateIndexResponse.pagination;

  TestValidator.equals(
    "page index should be consistent across filter modes",
    tristatePagination.current,
    enabledPagination.current,
  );

  TestValidator.equals(
    "page size should be consistent across filter modes",
    tristatePagination.limit,
    enabledPagination.limit,
  );

  TestValidator.predicate(
    "unfiltered total records should be >= enabled-only records",
    tristatePagination.records >= enabledPagination.records,
  );

  TestValidator.predicate(
    "unfiltered total records should be >= disabled-only records",
    tristatePagination.records >= disabledPagination.records,
  );
}
