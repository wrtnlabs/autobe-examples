import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSystemSetting";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

export async function test_api_system_settings_search_with_basic_filters(
  connection: api.IConnection,
) {
  /**
   * 1. Register and authenticate an admin user via /auth/adminUser/join.
   * 2. Seed multiple system settings with varied keys, groups, and enabled flags
   *    via POST /todoApp/adminUser/systemSettings.
   * 3. Search settings with PATCH /todoApp/adminUser/systemSettings using
   *    ITodoAppSystemSetting.IRequest filters: page, pageSize, key substring,
   *    group, enabled=true.
   * 4. Validate pagination metadata and that returned summaries respect all
   *    filters and match seeded data.
   */

  // 1. Register and authenticate an admin user.
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "Admin!234" as string & tags.Format<"password">,
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/register" as string & tags.Format<"uri">,
    referrer: "https://admin.todo-app.test" as string & tags.Format<"uri">,
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Seed multiple system settings.
  const groupLimits = "limits";
  const groupFeatures = "features";
  const keyPrefix = "max_active_todos";

  const seeds: ITodoAppSystemSetting.ICreate[] = [
    {
      key: `${keyPrefix}_per_user_enabled_true_1`,
      value: "100",
      type: "int",
      description: "Max active todos per user for limits group, enabled",
      group: groupLimits,
      enabled: true,
    },
    {
      key: `${keyPrefix}_per_user_enabled_true_2`,
      value: "200",
      type: "int",
      description: "Another max limit in limits group, enabled",
      group: groupLimits,
      enabled: true,
    },
    {
      key: `${keyPrefix}_per_user_enabled_false_1`,
      value: "300",
      type: "int",
      description: "Disabled setting in limits group",
      group: groupLimits,
      enabled: false,
    },
    {
      key: `otherprefix_enabled_true_1`,
      value: "true",
      type: "boolean",
      description: "Feature flag in features group, enabled",
      group: groupFeatures,
      enabled: true,
    },
    {
      key: `${keyPrefix}_features_group_enabled_true`,
      value: "true",
      type: "boolean",
      description: "Setting in features group but matching key substring",
      group: groupFeatures,
      enabled: true,
    },
  ];

  const createdSettings: ITodoAppSystemSetting[] = [];
  for (const seed of seeds) {
    const created =
      await api.functional.todoApp.adminUser.systemSettings.create(connection, {
        body: seed,
      });
    typia.assert(created);
    createdSettings.push(created);
  }

  // Build a map from key to created setting for later comparison.
  const createdByKey = new Map<string, ITodoAppSystemSetting>();
  for (const setting of createdSettings) {
    createdByKey.set(setting.key, setting);
  }

  // 3. Execute search with basic filters.
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const pageSize = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const requestBody = {
    page,
    pageSize,
    key: keyPrefix,
    group: groupLimits,
    enabled: true,
    createdFrom: undefined,
    createdTo: undefined,
    updatedFrom: undefined,
    updatedTo: undefined,
    sortBy: "key",
    sortDirection: "asc",
  } satisfies ITodoAppSystemSetting.IRequest;

  const pageResult: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.adminUser.systemSettings.index(connection, {
      body: requestBody,
    });
  typia.assert(pageResult);

  const pagination = pageResult.pagination;
  const data = pageResult.data;

  // 4. Validate pagination metadata.
  TestValidator.equals(
    "pagination current page matches request",
    pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit matches requested pageSize",
    pagination.limit,
    pageSize,
  );

  // Compute expected matches based on seed data.
  const expectedMatches = createdSettings.filter(
    (s) =>
      s.group === groupLimits &&
      s.enabled === true &&
      s.key.includes(keyPrefix),
  );

  TestValidator.predicate(
    "pagination.records is at least number of matching seeded settings",
    () => pagination.records >= expectedMatches.length,
  );

  TestValidator.predicate(
    "pagination.pages is consistent with records and limit",
    () => {
      const expectedPages =
        pagination.limit === 0
          ? 0
          : Math.ceil(pagination.records / pagination.limit);
      return pagination.pages === expectedPages;
    },
  );

  // 5. Validate each returned summary respects filters and matches seeded data.
  for (const summary of data) {
    // typia.assert on each summary is already covered by pageResult assert,
    // but we can rely on type safety here.

    TestValidator.predicate(
      `summary key contains filter substring for key ${summary.key}`,
      () => summary.key.includes(keyPrefix),
    );
    TestValidator.equals(
      `summary group equals requested group for key ${summary.key}`,
      summary.group ?? null,
      groupLimits,
    );
    TestValidator.equals(
      `summary enabled is true for key ${summary.key}`,
      summary.enabled,
      true,
    );

    // Cross-check against seeded data if this key was seeded.
    const original = createdByKey.get(summary.key);
    if (original !== undefined) {
      TestValidator.equals(
        `summary type matches original for key ${summary.key}`,
        summary.type,
        original.type,
      );
      TestValidator.equals(
        `summary value matches original for key ${summary.key}`,
        summary.value,
        original.value,
      );
      TestValidator.equals(
        `summary description matches original (nullable safe) for key ${summary.key}`,
        summary.description ?? null,
        original.description ?? null,
      );
      TestValidator.equals(
        `summary group matches original (nullable safe) for key ${summary.key}`,
        summary.group ?? null,
        original.group ?? null,
      );
      TestValidator.equals(
        `summary enabled matches original for key ${summary.key}`,
        summary.enabled,
        original.enabled,
      );
    }

    // Ensure no summary violates the enabled or group filter from seed space.
    TestValidator.predicate(
      `no summary outside group ${groupLimits} with enabled=false for key ${summary.key}`,
      () => summary.enabled === true && summary.group === groupLimits,
    );
  }
}
