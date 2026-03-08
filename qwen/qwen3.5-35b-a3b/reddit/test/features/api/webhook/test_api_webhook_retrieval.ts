import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformWebhook } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformWebhook";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_webhook_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: typia.random<IRedditPlatformAdmin.IJoin>(),
  });
  typia.assert(adminAuth);
  // Step 2: Generate a webhook ID and attempt retrieval
  // Note: In real API mode, this would fail if webhook doesn't exist (404)
  // In simulation mode, this returns random webhook data for validation
  const webhookId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const webhook = await api.functional.redditPlatform.admin.webhooks.at(
    adminConnection,
    {
      webhookId,
    },
  );
  typia.assert(webhook);
  // Step 3: Validate all required response fields exist and have correct types
  TestValidator.equals("webhook ID matches request", webhook.id, webhookId);
  TestValidator.equals(
    "endpoint URL exists",
    webhook.endpointUrl !== undefined,
    true,
  );
  TestValidator.equals(
    "endpoint URL is valid URI",
    typia.is<string & tags.Format<"uri">>(webhook.endpointUrl),
    true,
  );
  TestValidator.equals(
    "event types is array",
    Array.isArray(webhook.eventTypes),
    true,
  );
  TestValidator.equals(
    "event types has at least one item",
    webhook.eventTypes.length >= 1,
    true,
  );
  TestValidator.equals(
    "verification status is valid",
    webhook.verificationStatus === "confirmed" ||
      webhook.verificationStatus === "pending",
    true,
  );
  TestValidator.equals(
    "creation timestamp exists",
    webhook.createdAt !== undefined,
    true,
  );
  TestValidator.equals(
    "creation timestamp is valid datetime",
    typia.is<string & tags.Format<"date-time">>(webhook.createdAt),
    true,
  );
  TestValidator.equals(
    "update timestamp exists",
    webhook.updatedAt !== undefined,
    true,
  );
  TestValidator.equals(
    "update timestamp is valid datetime",
    typia.is<string & tags.Format<"date-time">>(webhook.updatedAt),
    true,
  );
  TestValidator.equals(
    "total deliveries is non-negative int32",
    webhook.totalDeliveries >= 0,
    true,
  );
  TestValidator.equals(
    "failed deliveries is non-negative int32",
    webhook.failedDeliveries >= 0,
    true,
  );
  // Step 4: Validate that no sensitive fields are present
  TestValidator.equals(
    "no verification_token field",
    !("verification_token" in webhook),
    true,
  );
  TestValidator.equals(
    "no secret field",
    !("secret" in webhook),
    true,
  );
  // Step 5: Validate delivery statistics initialization (for new webhook)
  // For a newly retrieved webhook (in simulation), stats should be 0
  TestValidator.equals(
    "total deliveries is zero for new webhook",
    webhook.totalDeliveries,
    0,
  );
  TestValidator.equals(
    "failed deliveries is zero for new webhook",
    webhook.failedDeliveries,
    0,
  );
  // Step 6: Validate lastDeliveryAt is optional nullable
  if (webhook.lastDeliveryAt !== undefined) {
    TestValidator.equals(
      "lastDeliveryAt is valid datetime when present",
      typia.is<string & tags.Format<"date-time">>(webhook.lastDeliveryAt!),
      true,
    );
  }
}