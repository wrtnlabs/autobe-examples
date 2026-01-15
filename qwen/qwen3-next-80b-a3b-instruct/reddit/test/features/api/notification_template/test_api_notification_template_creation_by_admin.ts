import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationTemplate";
import { prepare_random_community_platform_notification_template } from "../../../prepare/prepare_random_community_platform_notification_template";
import { generate_random_community_platform_admin_notification_templates_create } from "../../../generate/generate_random_community_platform_admin_notification_templates_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_notification_template_creation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // adminConnection.headers is now updated with authentication token
  // Step 2: Generate random notification template data with required fields and placeholders
  const templateData = {
    name: "welcome_email", // Unique template name in camelCase
    subject: "Welcome to Our Community Platform!", // Non-empty subject
    body: "Hello {{firstName}} {{lastName}},\n\nWelcome to our community platform! We're excited to have you join us.\n\nYour account has been created successfully.\n\nBest regards,\nThe Community Team", // Valid body with placeholders
    priority: "high", // Valid priority value
    tags: ["onboarding", "welcome"], // Valid tag array
    is_active: true, // Template should be active
  } satisfies ICommunityPlatformNotificationTemplate.ICreate;
  // Step 3: Create the notification template using the admin connection
  const createdTemplate: ICommunityPlatformNotificationTemplate =
    await api.functional.communityPlatform.admin.notification_templates.create(
      adminConnection, // Use admin-specific connection, not base connection
      { body: templateData },
    );
  typia.assert(createdTemplate);
  // Step 4: Validate that the created template matches the expected data
  TestValidator.equals(
    "template name matches",
    createdTemplate.name,
    templateData.name,
  );
  TestValidator.equals(
    "template subject matches",
    createdTemplate.subject,
    templateData.subject,
  );
  TestValidator.equals(
    "template body matches",
    createdTemplate.body,
    templateData.body,
  );
  TestValidator.equals(
    "template priority matches",
    createdTemplate.priority,
    templateData.priority,
  );
  TestValidator.equals(
    "template tags count matches",
    createdTemplate.tags.length,
    templateData.tags.length,
  );
  // Step 5: Validate all tags are present
  for (const tag of templateData.tags) {
    TestValidator.predicate(
      `tag '${tag}' exists in template tags`,
      createdTemplate.tags.includes(tag),
    );
  }
}
