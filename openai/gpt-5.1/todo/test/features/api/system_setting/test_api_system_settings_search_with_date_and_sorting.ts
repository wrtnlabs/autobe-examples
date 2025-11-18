import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSystemSetting";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

export async function test_api_system_settings_search_with_date_and_sorting(
  connection: api.IConnection,
) {
  // 1. Join an admin user to obtain authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todoapp.local/join",
    referrer: "https://admin.todoapp.local/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const admin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(admin);

  // 2. Create multiple system settings with distinct keys
  const baseKeyPrefix = `e2e_system_setting_${RandomGenerator.alphaNumeric(8)}`;

  const settingsToCreate: ITodoAppSystemSetting.ICreate[] = [
    {
      key: `${baseKeyPrefix}_old_1`,
      value: "10",
      type: "int",
      description: RandomGenerator.paragraph({ sentences: 3 }),
      group: "limits",
      enabled: true,
    },
    {
      key: `${baseKeyPrefix}_old_2`,
      value: "false",
      type: "boolean",
      description: RandomGenerator.paragraph({ sentences: 2 }),
      group: "features",
      enabled: false,
    },
    {
      key: `${baseKeyPrefix}_new_1`,
      value: "true",
      type: "boolean",
      description: RandomGenerator.paragraph({ sentences: 2 }),
      group: "features",
      enabled: true,
    },
    {
      key: `${baseKeyPrefix}_new_2`,
      value: "100",
      type: "int",
      description: RandomGenerator.paragraph({ sentences: 3 }),
      group: "limits",
      enabled: true,
    },
  ];

  const createdSettings: ITodoAppSystemSetting[] = [];
  for (const body of settingsToCreate) {
    const created =
      await api.functional.todoApp.adminUser.systemSettings.create(connection, {
        body,
      });
    typia.assert<ITodoAppSystemSetting>(created);
    createdSettings.push(created);
  }

  // Assume later-created settings have later created_at/updated_at values.
  // Take timestamps around creation of "new" settings as range boundaries.
  const oldSettings = createdSettings.filter((s) => s.key.includes("_old_"));
  const newSettings = createdSettings.filter((s) => s.key.includes("_new_"));

  // Sanity checks for created settings
  TestValidator.equals(
    "there should be both old and new settings",
    createdSettings.length,
    settingsToCreate.length,
  );
  TestValidator.predicate("old settings exist", oldSettings.length > 0);
  TestValidator.predicate("new settings exist", newSettings.length > 0);

  // Derive time window boundaries based on created_at of one old and one new.
  // Use the earliest new and latest created to build a window that focuses on newer records.
  const sortedByCreatedAt = [...createdSettings].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );

  const earliestNew = sortedByCreatedAt.find((s) => s.key.includes("_new_"));

  TestValidator.predicate("earliest new exists", earliestNew !== undefined);

  const createdFrom = earliestNew!.created_at;
  const latestCreated =
    sortedByCreatedAt[sortedByCreatedAt.length - 1]?.created_at ?? createdFrom;
  const createdTo = latestCreated;

  // 3. Search with date range and sorting by updated_at desc
  const requestBody = {
    page: 1,
    pageSize: 20,
    createdFrom,
    createdTo,
    sortBy: "updated_at",
    sortDirection: "desc" as const,
  } satisfies ITodoAppSystemSetting.IRequest;

  const page: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.adminUser.systemSettings.index(connection, {
      body: requestBody,
    });
  typia.assert<IPageITodoAppSystemSetting.ISummary>(page);

  const { pagination, data } = page;

  // 4. Basic pagination validations
  TestValidator.predicate(
    "pagination current page is 1",
    pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit equals requested pageSize",
    pagination.limit === 20,
  );
  TestValidator.predicate("records non-negative", pagination.records >= 0);
  TestValidator.predicate("pages non-negative", pagination.pages >= 0);

  // Records should at least be the number of items in data
  TestValidator.predicate(
    "records greater or equal to data length",
    pagination.records >= data.length,
  );

  // 5. Validate that all returned summaries correspond to created settings when applicable
  const createdById = new Map<string, ITodoAppSystemSetting>();
  for (const s of createdSettings) createdById.set(s.id, s);

  for (const summary of data) {
    const full = createdById.get(summary.id);
    if (full) {
      TestValidator.equals(
        "summary key matches full record",
        full.key,
        summary.key,
      );
      TestValidator.equals(
        "summary value matches full record",
        full.value,
        summary.value,
      );
      TestValidator.equals(
        "summary type matches full record",
        full.type,
        summary.type,
      );
      TestValidator.equals(
        "summary enabled matches full record",
        full.enabled,
        summary.enabled,
      );
    }
  }

  // 6. Verify that at least one old setting is not included in the results
  const resultIds = new Set(data.map((d) => d.id));
  const anyOldExcluded = oldSettings.some((s) => !resultIds.has(s.id));
  TestValidator.predicate(
    "at least one old setting is excluded by date range",
    anyOldExcluded,
  );

  // 7. Verify ordering by updated_at desc using detail GET
  const details: ITodoAppSystemSetting[] = [];
  for (const summary of data) {
    const detail = await api.functional.todoApp.adminUser.systemSettings.at(
      connection,
      {
        settingKey: summary.key,
      },
    );
    typia.assert<ITodoAppSystemSetting>(detail);
    details.push(detail);
  }

  for (let i = 1; i < details.length; ++i) {
    const prev = details[i - 1];
    const curr = details[i];
    TestValidator.predicate(
      "updated_at is non-increasing in desc order",
      prev.updated_at >= curr.updated_at,
    );
  }
}
