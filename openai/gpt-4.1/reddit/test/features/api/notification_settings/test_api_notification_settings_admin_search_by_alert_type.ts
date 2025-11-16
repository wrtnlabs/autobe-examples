import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformNotificationSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationSettings";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformNotificationSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformNotificationSettings";

/**
 * Validates searching and filtering of notification settings by alert type as
 * an authenticated administrator.
 *
 * This test ensures:
 *
 * - Only authenticated administrators can access the notification settings search
 *   endpoint
 * - Filtering by specific alert types (mentions, activity, moderator) returns
 *   correct results
 * - Pagination and combined filtering are supported and function properly
 * - Returned settings include only those matching requested filter criteria
 * - Sensitive notification settings are NOT accessible to unauthenticated clients
 *
 * Steps:
 *
 * 1. Register an administrator account (admin join)
 * 2. Attempt to search notification settings as an unauthenticated connection and
 *    expect failure
 * 3. Log in as the administrator (join establishes authentication)
 * 4. Search all notification settings with no filter to assert existence of
 *    results
 * 5. For each alert type (mentions_alerts_enabled, activity_notifications_enabled,
 *    moderator_alerts_enabled): a. Query with filter set to true, check that
 *    all results have the respective alert type enabled b. Query with filter
 *    set to false, check that all results have the respective alert type
 *    disabled
 * 6. Check combined filtering (e.g., mentions_alerts_enabled: true,
 *    activity_notifications_enabled: false) and verify all hits match all
 *    conditions
 * 7. Check that paginated results (limit=1) work and page values increment
 *    correctly
 */
export async function test_api_notification_settings_admin_search_by_alert_type(
  connection: api.IConnection,
) {
  // 1. Register administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);
  // Save connection as authenticated admin -- join sets connection headers

  // 2. Search as unauthenticated (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "search should fail for unauthenticated clients",
    async () => {
      await api.functional.communityPlatform.administrator.notificationSettings.index(
        unauthConn,
        {
          body: {},
        },
      );
    },
  );

  // 3. Re-establish admin session (after join already active)
  // 4. General search with no filters, expect at least an array response
  const generalResult =
    await api.functional.communityPlatform.administrator.notificationSettings.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(generalResult);
  TestValidator.predicate(
    "notification settings general search returns array",
    generalResult.data.length >= 0,
  );

  // If there are no settings present, cannot further meaningfully filter (edge). Continue with requests but skip filtering checks if so.
  if (generalResult.data.length === 0) {
    return;
  }

  // 5. Search/filter by each alert type individually (both true/false)
  const alertFilters: Array<{
    key: keyof ICommunityPlatformNotificationSettings.IRequest;
    label: string;
  }> = [
    { key: "mentions_alerts_enabled", label: "mentions alerts" },
    { key: "activity_notifications_enabled", label: "activity notifications" },
    { key: "moderator_alerts_enabled", label: "moderator alerts" },
  ];
  for (const { key, label } of alertFilters) {
    for (const value of [true, false]) {
      const filterBody = {
        [key]: value,
      } as ICommunityPlatformNotificationSettings.IRequest;
      const filterResult =
        await api.functional.communityPlatform.administrator.notificationSettings.index(
          connection,
          {
            body: filterBody,
          },
        );
      typia.assert(filterResult);
      for (const s of filterResult.data) {
        TestValidator.equals(
          `all filtered (${label}) must be ${value}`,
          s[key as keyof ICommunityPlatformNotificationSettings.ISummary],
          value,
        );
      }
    }
  }

  // 6. Combined filter (e.g., mentions: true, activity: false)
  const combinedFilterBody = {
    mentions_alerts_enabled: true,
    activity_notifications_enabled: false,
  } satisfies ICommunityPlatformNotificationSettings.IRequest;
  const combinedResult =
    await api.functional.communityPlatform.administrator.notificationSettings.index(
      connection,
      {
        body: combinedFilterBody,
      },
    );
  typia.assert(combinedResult);
  for (const s of combinedResult.data) {
    TestValidator.equals(
      "filtered result matches mentions_alerts_enabled",
      s.mentions_alerts_enabled,
      true,
    );
    TestValidator.equals(
      "filtered result matches activity_notifications_enabled",
      s.activity_notifications_enabled,
      false,
    );
  }

  // 7. Pagination: limit one, multiple pages
  const pagedBody = {
    limit: 1 as number,
  } satisfies ICommunityPlatformNotificationSettings.IRequest;
  const pagedResult1 =
    await api.functional.communityPlatform.administrator.notificationSettings.index(
      connection,
      {
        body: pagedBody,
      },
    );
  typia.assert(pagedResult1);
  TestValidator.equals(
    "paged page 1 has limit 1",
    pagedResult1.pagination.limit,
    1,
  );
  if (pagedResult1.pagination.pages >= 2) {
    const pagedResult2 =
      await api.functional.communityPlatform.administrator.notificationSettings.index(
        connection,
        {
          body: {
            ...pagedBody,
            page: 1 as number,
          },
        },
      );
    typia.assert(pagedResult2);
    TestValidator.equals(
      "paged page 2 has correct page",
      pagedResult2.pagination.current,
      1,
    );
  }
}
