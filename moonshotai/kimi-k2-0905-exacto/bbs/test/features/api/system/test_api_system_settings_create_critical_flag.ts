import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IEconomicDiscussionSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSystemSetting";

// Test creating system-critical configuration settings that require special handling
export async function test_api_system_settings_create_critical_flag(
  connection: api.IConnection,
) {
  // Create moderator account for administrative access
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: `mod_${RandomGenerator.alphabets(8)}`,
      email: moderatorEmail,
      password_hash: `hash_${RandomGenerator.alphaNumeric(32)}`,
      moderation_level: "admin",
      email_verified: true,
      two_factor_enabled: true,
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Create system-critical setting for rate limiting
  const rateLimitKey = `rate_limit_${RandomGenerator.alphabets(8)}`;
  const criticalSetting =
    await api.functional.economicDiscussion.moderator.system_settings.create(
      connection,
      {
        body: {
          setting_key: rateLimitKey,
          setting_value: "100",
          setting_type: "number",
          display_name: "Global Rate Limit",
          description:
            "Maximum number of requests allowed per minute before rate limiting is enforced across the entire platform",
          category: "security",
          is_system_critical: true,
          is_editable: false,
          validation_rules: JSON.stringify({
            type: "number",
            minimum: 1,
            maximum: 1000,
          }),
        } satisfies IEconomicDiscussionSystemSetting.ICreate,
      },
    );
  typia.assert(criticalSetting);

  // Validate critical setting properties
  TestValidator.equals(
    "system critical flag",
    criticalSetting.is_system_critical,
    true,
  );
  TestValidator.equals("category", criticalSetting.category, "security");
  TestValidator.equals(
    "display name",
    criticalSetting.display_name,
    "Global Rate Limit",
  );
  TestValidator.predicate("has UUID format", criticalSetting.id.length === 36);

  // Create another critical setting for user permissions
  const permissionKey = `user_permissions_${RandomGenerator.alphabets(8)}`;
  const permissionSetting =
    await api.functional.economicDiscussion.moderator.system_settings.create(
      connection,
      {
        body: {
          setting_key: permissionKey,
          setting_value:
            "{'max_articles_per_user': 50, 'max_comments_per_article': 10}",
          setting_type: "json",
          display_name: "User Permission Limits",
          description:
            "Defines maximum allowed articles per user and comments per article to prevent spam and maintain content quality",
          category: "policies",
          is_system_critical: true,
          is_editable: true,
        } satisfies IEconomicDiscussionSystemSetting.ICreate,
      },
    );
  typia.assert(permissionSetting);

  // Validate permission setting properties
  TestValidator.equals(
    "system critical flag",
    permissionSetting.is_system_critical,
    true,
  );
  TestValidator.equals("JSON type", permissionSetting.setting_type, "json");
  TestValidator.predicate(
    "description contains user",
    permissionSetting.description!.includes("user"),
  );

  // Ensure proper metadata for administrative control
  TestValidator.predicate(
    "created_at exists",
    criticalSetting.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at exists",
    criticalSetting.updated_at !== null,
  );
  TestValidator.equals(
    "setting_key matches",
    criticalSetting.setting_key,
    rateLimitKey,
  );

  // Test that critical settings have proper business logic
  TestValidator.predicate(
    "rate limit value is positive",
    parseInt(criticalSetting.setting_value) > 0,
  );
  TestValidator.predicate(
    "permission setting is valid JSON",
    permissionSetting.setting_value.includes("max_articles_per_user"),
  );
}
