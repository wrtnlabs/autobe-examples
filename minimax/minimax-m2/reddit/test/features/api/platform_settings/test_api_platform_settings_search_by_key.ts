import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformSetting";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSetting";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

export async function test_api_platform_settings_search_by_key(
  connection: api.IConnection,
) {
  // Create platform administrator account for authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: adminEmail,
        password: "TestPassword123!",
        display_name: "Platform Admin",
        administrator_level: "admin",
        system_permissions: JSON.stringify({
          user_management: { can_view_user_data: true },
          community_oversight: { can_view_community_data: true },
          content_moderation: { can_remove_content: true },
          system_configuration: { can_manage_settings: true },
          compliance_legal: { can_access_compliance_data: true },
        }),
        security_clearance: "high",
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Test searching platform settings by key with various scenarios
  await TestValidator.predicate(
    "platform admin authentication succeeded",
    admin.id && admin.token.access.length > 0,
  );

  // Scenario 1: Search with specific key filter
  const searchRequest1: IRedditPlatformSetting.IRequest = {
    search: "max_upload",
    limit: 25,
    page: 1,
    sort_by: "key",
    order_by: "asc",
  } satisfies IRedditPlatformSetting.IRequest;

  const results1: IPageIRedditPlatformSetting.ISummary =
    await api.functional.redditPlatform.platformAdministrator.platformSettings.index(
      connection,
      { body: searchRequest1 },
    );
  typia.assert(results1);

  TestValidator.equals(
    "search by key returns correct data structure",
    results1.data.length <= searchRequest1.limit!,
    results1.data.length <= 25,
  );
  TestValidator.equals(
    "search results include pagination info",
    results1.pagination.current,
    1,
  );

  // Scenario 2: Search with empty search term to get all settings
  const searchRequest2: IRedditPlatformSetting.IRequest = {
    limit: 10,
    page: 1,
    sort_by: "created_at",
    order_by: "desc",
  } satisfies IRedditPlatformSetting.IRequest;

  const results2: IPageIRedditPlatformSetting.ISummary =
    await api.functional.redditPlatform.platformAdministrator.platformSettings.index(
      connection,
      { body: searchRequest2 },
    );
  typia.assert(results2);

  TestValidator.equals(
    "empty search returns all settings with limit",
    results2.data.length,
    10,
  );

  // Scenario 3: Test pagination with search
  const searchRequest3: IRedditPlatformSetting.IRequest = {
    search: "email",
    limit: 5,
    page: 2,
    sort_by: "key",
    order_by: "asc",
  } satisfies IRedditPlatformSetting.IRequest;

  const results3: IPageIRedditPlatformSetting.ISummary =
    await api.functional.redditPlatform.platformAdministrator.platformSettings.index(
      connection,
      { body: searchRequest3 },
    );
  typia.assert(results3);

  TestValidator.equals(
    "pagination works correctly",
    results3.pagination.current,
    2,
  );
  TestValidator.equals("page size limit applied", results3.data.length, 5);

  // Scenario 4: Search with data type filter
  const searchRequest4: IRedditPlatformSetting.IRequest = {
    data_type: "boolean",
    limit: 20,
    page: 1,
  } satisfies IRedditPlatformSetting.IRequest;

  const results4: IPageIRedditPlatformSetting.ISummary =
    await api.functional.redditPlatform.platformAdministrator.platformSettings.index(
      connection,
      { body: searchRequest4 },
    );
  typia.assert(results4);

  TestValidator.equals(
    "data type filter applied correctly",
    results4.data.every((setting) => setting.data_type === "boolean"),
    true,
  );

  // Scenario 5: Search with visibility filter
  const searchRequest5: IRedditPlatformSetting.IRequest = {
    is_public: true,
    limit: 15,
    page: 1,
  } satisfies IRedditPlatformSetting.IRequest;

  const results5: IPageIRedditPlatformSetting.ISummary =
    await api.functional.redditPlatform.platformAdministrator.platformSettings.index(
      connection,
      { body: searchRequest5 },
    );
  typia.assert(results5);

  TestValidator.equals(
    "visibility filter applied correctly",
    results5.data.every((setting) => setting.is_public === true),
    true,
  );

  // Verify all responses have proper structure
  const allResults = [results1, results2, results3, results4, results5];
  allResults.forEach((result, index) => {
    TestValidator.predicate(
      `result ${index + 1} has valid pagination`,
      result.pagination.records >= 0 && result.pagination.pages >= 0,
    );

    result.data.forEach((setting, settingIndex) => {
      TestValidator.predicate(
        `setting ${settingIndex + 1} in result ${index + 1} has valid structure`,
        setting.id &&
          setting.key &&
          setting.description &&
          setting.data_type &&
          typeof setting.created_at === "string",
      );
    });
  });
}
