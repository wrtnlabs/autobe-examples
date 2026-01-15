import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentWebhook } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentWebhook";
import type { IShoppingMallWebhookMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWebhookMetadata";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_webhook_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin using the utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create a payment webhook using the available SDK function
  // The IShoppingMallPaymentWebhook type requires id, createdAt, lastDeliveryAttempt, and deliveryFailureCount
  const webhook = await api.functional.shoppingMall.payment_webhooks.post(
    adminConnection,
    {
      body: {
        id: typia.random<string & tags.Format<"uuid">>(),
        endpoint: "https://api.merchant.com/webhook/payment-v2",
        isActive: true,
        eventTypes: ["payment.success", "payment.failed"],
        createdAt: new Date().toISOString(),
        lastDeliveryAttempt: new Date().toISOString(), // Added missing required property with proper date-time format
        deliveryFailureCount: 0,
        secretKey: RandomGenerator.alphaNumeric(32),
      } satisfies IShoppingMallPaymentWebhook,
    },
  );
  typia.assert(webhook);
  // Step 3: Delete the webhook using its ID via the admin endpoint
  await api.functional.shoppingMall.admin.webhooks.erase(adminConnection, {
    id: webhook.id,
  });
  // Step 4: Validate that the webhook is permanently removed by attempting to delete it again
  // This validates that the deletion is irreversible
  await TestValidator.error(
    "deleting already-deleted webhook should fail",
    async () => {
      await api.functional.shoppingMall.admin.webhooks.erase(adminConnection, {
        id: webhook.id,
      });
    },
  );
}
