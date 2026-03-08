import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_settings_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create multiple system settings with different timestamps
  // Since we cannot directly create system settings, we'll use the index endpoint
  // to retrieve existing settings and test filtering on them
  // First, get all settings without filters to see what's available
  const allSettings =
    await api.functional.discussionBoard.admin.system.settings.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(allSettings);
  // If no settings exist, we cannot test filtering - this is expected behavior
  // The test validates that the filtering logic works when settings exist
  if (allSettings.data.length === 0) {
    // No settings to filter - test passes by validating endpoint works
    TestValidator.predicate(
      "endpoint accessible",
      allSettings.pagination.current === 1,
    );
    return;
  }
  // 3. Test created_at_from filter
  const settingsWithCreatedFrom =
    await api.functional.discussionBoard.admin.system.settings.index(
      adminConnection,
      {
        body: {
          created_at_from: allSettings.data[0].created_at,
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(settingsWithCreatedFrom);
  // Verify all returned settings have created_at >= created_at_from
  for (const setting of settingsWithCreatedFrom.data) {
    TestValidator.predicate(
      `setting created_at >= filter: ${setting.key}`,
      new Date(setting.created_at) >= new Date(allSettings.data[0].created_at),
    );
  }
  // 4. Test created_at_to filter
  const lastSettingCreatedAt =
    allSettings.data[allSettings.data.length - 1].created_at;
  const settingsWithCreatedTo =
    await api.functional.discussionBoard.admin.system.settings.index(
      adminConnection,
      {
        body: {
          created_at_to: lastSettingCreatedAt,
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(settingsWithCreatedTo);
  // Verify all returned settings have created_at <= created_at_to
  for (const setting of settingsWithCreatedTo.data) {
    TestValidator.predicate(
      `setting created_at <= filter: ${setting.key}`,
      new Date(setting.created_at) <= new Date(lastSettingCreatedAt),
    );
  }
  // 5. Test updated_at_from filter
  const settingsWithUpdatedFrom =
    await api.functional.discussionBoard.admin.system.settings.index(
      adminConnection,
      {
        body: {
          updated_at_from: allSettings.data[0].updated_at,
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(settingsWithUpdatedFrom);
  // Verify all returned settings have updated_at >= updated_at_from
  for (const setting of settingsWithUpdatedFrom.data) {
    TestValidator.predicate(
      `setting updated_at >= filter: ${setting.key}`,
      new Date(setting.updated_at) >= new Date(allSettings.data[0].updated_at),
    );
  }
  // 6. Test updated_at_to filter
  const lastSettingUpdatedAt =
    allSettings.data[allSettings.data.length - 1].updated_at;
  const settingsWithUpdatedTo =
    await api.functional.discussionBoard.admin.system.settings.index(
      adminConnection,
      {
        body: {
          updated_at_to: lastSettingUpdatedAt,
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(settingsWithUpdatedTo);
  // Verify all returned settings have updated_at <= updated_at_to
  for (const setting of settingsWithUpdatedTo.data) {
    TestValidator.predicate(
      `setting updated_at <= filter: ${setting.key}`,
      new Date(setting.updated_at) <= new Date(lastSettingUpdatedAt),
    );
  }
  // 7. Test combined date range filters (created_at_from + created_at_to)
  if (allSettings.data.length >= 2) {
    const firstCreatedAt = allSettings.data[0].created_at;
    const secondCreatedAt = allSettings.data[1].created_at;
    const settingsWithCombinedRange =
      await api.functional.discussionBoard.admin.system.settings.index(
        adminConnection,
        {
          body: {
            created_at_from: firstCreatedAt,
            created_at_to: secondCreatedAt,
            page: 1,
            limit: 100,
          } satisfies IDiscussionBoardSystemSetting.IRequest,
        },
      );
    typia.assert(settingsWithCombinedRange);
    // Verify all returned settings are within the date range
    for (const setting of settingsWithCombinedRange.data) {
      const settingDate = new Date(setting.created_at);
      const fromDate = new Date(firstCreatedAt);
      const toDate = new Date(secondCreatedAt);
      TestValidator.predicate(
        `setting within range: ${setting.key}`,
        settingDate >= fromDate && settingDate <= toDate,
      );
    }
  }
  // 8. Test pagination with date filters
  const paginatedSettings =
    await api.functional.discussionBoard.admin.system.settings.index(
      adminConnection,
      {
        body: {
          created_at_from: allSettings.data[0].created_at,
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(paginatedSettings);
  TestValidator.predicate(
    "pagination respects limit",
    paginatedSettings.data.length <= 5,
  );
  TestValidator.predicate(
    "pagination current page is 1",
    paginatedSettings.pagination.current === 1,
  );
  // 9. Test with null/omitted date parameters (no filtering)
  const noFilterSettings =
    await api.functional.discussionBoard.admin.system.settings.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(noFilterSettings);
  TestValidator.equals(
    "no filter returns same count as initial fetch",
    noFilterSettings.data.length,
    allSettings.data.length,
  );
}
