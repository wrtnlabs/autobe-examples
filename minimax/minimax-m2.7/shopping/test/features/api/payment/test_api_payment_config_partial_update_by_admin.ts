import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallPaymentConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallPaymentConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_payment_config_partial_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      actorType: "customer",
      requestedGrade: "admin",
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Set initial complete configuration
  const initialConfig =
    await api.functional.ecommerceMall.admin.payments.config.update(
      adminLoginConnection,
      {
        body: {
          gatewayName: "stripe",
          apiEndpoint: "https://api.stripe.com/v1" satisfies string &
            tags.Format<"uri">,
          mode: "test",
          timeoutSeconds: 30 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<300>,
          webhookUrl: "https://example.com/webhook/stripe" satisfies string &
            tags.Format<"uri">,
          merchantId: "merchant_12345",
        } satisfies IEcommerceMallPaymentConfig.IUpdate,
      },
    );
  typia.assert(initialConfig);
  // Store original values for comparison
  const originalGatewayName = initialConfig.gatewayName;
  const originalApiEndpoint = initialConfig.apiEndpoint;
  const originalMode = initialConfig.mode;
  const originalMerchantId = initialConfig.merchantId;
  // 3. Perform partial update with only webhookUrl and timeoutSeconds
  const newWebhookUrl =
    "https://example.com/webhook/stripe/new" satisfies string &
      tags.Format<"uri">;
  const newTimeoutSeconds = 60 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<300>;
  const partialUpdateResult =
    await api.functional.ecommerceMall.admin.payments.config.update(
      adminLoginConnection,
      {
        body: {
          webhookUrl: newWebhookUrl,
          timeoutSeconds: newTimeoutSeconds,
        } satisfies IEcommerceMallPaymentConfig.IUpdate,
      },
    );
  typia.assert(partialUpdateResult);
  // 4. Verify changed fields have new values
  TestValidator.equals(
    "webhookUrl updated",
    partialUpdateResult.webhookUrl,
    newWebhookUrl,
  );
  TestValidator.equals(
    "timeoutSeconds updated",
    partialUpdateResult.timeoutSeconds,
    newTimeoutSeconds,
  );
  // 5. Verify unchanged fields preserve existing values
  TestValidator.equals(
    "gatewayName preserved",
    partialUpdateResult.gatewayName,
    originalGatewayName,
  );
  TestValidator.equals(
    "apiEndpoint preserved",
    partialUpdateResult.apiEndpoint,
    originalApiEndpoint,
  );
  TestValidator.equals(
    "mode preserved",
    partialUpdateResult.mode,
    originalMode,
  );
  TestValidator.equals(
    "merchantId preserved",
    partialUpdateResult.merchantId,
    originalMerchantId,
  );
  // 6. Verify configuration is persisted by retrieving again
  const persistedConfig =
    await api.functional.ecommerceMall.admin.payments.config.update(
      adminLoginConnection,
      {
        body: {},
      },
    );
  typia.assert(persistedConfig);
  TestValidator.equals(
    "persisted webhookUrl",
    persistedConfig.webhookUrl,
    newWebhookUrl,
  );
  TestValidator.equals(
    "persisted timeoutSeconds",
    persistedConfig.timeoutSeconds,
    newTimeoutSeconds,
  );
  TestValidator.equals(
    "persisted gatewayName",
    persistedConfig.gatewayName,
    originalGatewayName,
  );
  TestValidator.equals(
    "persisted apiEndpoint",
    persistedConfig.apiEndpoint,
    originalApiEndpoint,
  );
}