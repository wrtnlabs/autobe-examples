import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallEmailTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailTemplate";

/**
 * Test creating a notification email template for shipping status updates.
 *
 * This test validates the complete workflow of creating a shipping notification
 * email template by an authenticated admin. The process involves:
 *
 * 1. Admin registration and authentication to obtain necessary privileges
 * 2. Creating a sales channel for channel-specific template customization
 * 3. Creating an email template with shipping notification variables
 * 4. Validating the template contains proper structure and configuration
 *
 * The email template supports real-time shipment notifications with dynamic
 * placeholders for tracking numbers, carrier names, estimated delivery dates,
 * and shipment status updates.
 */
export async function test_api_email_template_creation_notification_shipping_update(
  connection: api.IConnection,
) {
  // Step 1: Admin registration and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
        role_level: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a sales channel for template customization
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        channel_code: `CH_${RandomGenerator.alphaNumeric(8)}`,
        channel_name: `${RandomGenerator.name(2)} Channel`,
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(channel);

  // Step 3: Create shipping notification email template
  const template: IShoppingMallEmailTemplate =
    await api.functional.shoppingMall.admin.emailTemplates.create(connection, {
      body: {
        template_code: "SHIPMENT_NOTIFICATION",
        template_name: "Shipping Status Update Notification",
      } satisfies IShoppingMallEmailTemplate.ICreate,
    });
  typia.assert(template);

  // Step 4: Validate template creation
  TestValidator.equals(
    "template code matches",
    template.template_code,
    "SHIPMENT_NOTIFICATION",
  );
  TestValidator.equals(
    "template name matches",
    template.template_name,
    "Shipping Status Update Notification",
  );
}
