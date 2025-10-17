import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallEmailTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailTemplate";

/**
 * Test creating an email template for marketing promotional campaigns.
 *
 * This test validates the workflow of creating an email template:
 *
 * 1. Admin authenticates to gain template management permissions
 * 2. Creates a sales channel for template organization
 * 3. Creates an email template with proper identification
 * 4. Validates template creation with correct properties
 *
 * The test uses a promotional campaign context with Spanish language naming
 * conventions to represent a realistic use case.
 */
export async function test_api_email_template_creation_marketing_promotional_campaign(
  connection: api.IConnection,
) {
  // Step 1: Admin authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const adminName = RandomGenerator.name();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
      role_level: "super_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create sales channel
  const channelCode = RandomGenerator.alphaNumeric(10);
  const channelName = RandomGenerator.name(2);

  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        channel_code: channelCode,
        channel_name: channelName,
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // Step 3: Create marketing email template for promotional campaign
  const templateCode = "PROMOTIONAL_CAMPAIGN_ES";
  const templateName = "Spanish Promotional Campaign Template";

  const emailTemplate =
    await api.functional.shoppingMall.admin.emailTemplates.create(connection, {
      body: {
        template_code: templateCode,
        template_name: templateName,
      } satisfies IShoppingMallEmailTemplate.ICreate,
    });
  typia.assert(emailTemplate);

  // Step 4: Validate the created template
  TestValidator.equals(
    "template code matches",
    emailTemplate.template_code,
    templateCode,
  );
  TestValidator.equals(
    "template name matches",
    emailTemplate.template_name,
    templateName,
  );
  TestValidator.predicate(
    "template has valid ID",
    typeof emailTemplate.id === "string" && emailTemplate.id.length > 0,
  );
}
