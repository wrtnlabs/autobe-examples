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

export async function test_api_payment_config_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Submit admin request using utility function
  await authorize_admin_join(connection, {
    body: {
      actorType: "customer",
      requestedGrade: "admin",
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Login as admin using utility function
  const adminAuth = await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  typia.assert(adminAuth);
  // 4. Call GET /ecommerceMall/admin/payments/config
  const paymentConfig =
    await api.functional.ecommerceMall.admin.payments.config.at(
      adminConnection,
    );
  // 5. Validate response using typia.assert
  typia.assert(paymentConfig);
  // 6. Validate payment configuration fields exist and are properly typed
  TestValidator.predicate(
    "paymentMethods array exists and is non-empty",
    paymentConfig.paymentMethods.length > 0,
  );
  TestValidator.predicate(
    "defaultCurrency is a valid ISO 4217 code",
    /^[A-Z]{3}$/.test(paymentConfig.defaultCurrency),
  );
  TestValidator.predicate(
    "supportedCurrencies array exists and contains default currency",
    paymentConfig.supportedCurrencies.includes(paymentConfig.defaultCurrency),
  );
  TestValidator.predicate(
    "gatewayUrl is a valid URI",
    paymentConfig.gatewayUrl.startsWith("http://") ||
      paymentConfig.gatewayUrl.startsWith("https://"),
  );
  TestValidator.predicate(
    "timeoutSeconds is a positive number",
    paymentConfig.timeoutSeconds > 0,
  );
  TestValidator.predicate(
    "webhookCallbackUrl is a valid URI",
    paymentConfig.webhookCallbackUrl.startsWith("http://") ||
      paymentConfig.webhookCallbackUrl.startsWith("https://"),
  );
  TestValidator.predicate(
    "merchantId is a non-empty string",
    paymentConfig.merchantId.length > 0,
  );
  // 7. Validate retry configuration structure
  TestValidator.predicate(
    "retryConfig exists",
    paymentConfig.retryConfig !== undefined,
  );
  if (paymentConfig.retryConfig) {
    TestValidator.equals(
      "maxRetries is non-negative if present",
      paymentConfig.retryConfig.maxRetries !== undefined
        ? paymentConfig.retryConfig.maxRetries >= 0
        : true,
      true,
    );
    TestValidator.equals(
      "backoffMultiplier is non-negative if present",
      paymentConfig.retryConfig.backoffMultiplier !== undefined
        ? paymentConfig.retryConfig.backoffMultiplier >= 0
        : true,
      true,
    );
    TestValidator.equals(
      "initialDelayMs is non-negative if present",
      paymentConfig.retryConfig.initialDelayMs !== undefined
        ? paymentConfig.retryConfig.initialDelayMs >= 0
        : true,
      true,
    );
  }
  // 8. Verify NO sensitive credentials are included
  TestValidator.equals(
    "paymentMethods does not contain sensitive data",
    paymentConfig.paymentMethods.some(
      (method) =>
        method.toLowerCase().includes("secret") ||
        method.toLowerCase().includes("key") ||
        method.toLowerCase().includes("password"),
    ),
    false,
  );
  TestValidator.equals(
    "merchantId is not a sensitive credential",
    paymentConfig.merchantId.toLowerCase().includes("secret") ||
      paymentConfig.merchantId.toLowerCase().includes("key") ||
      paymentConfig.merchantId.toLowerCase().includes("password"),
    false,
  );
  TestValidator.equals(
    "gatewayUrl does not contain sensitive path segments",
    paymentConfig.gatewayUrl.includes("/secrets/") ||
      paymentConfig.gatewayUrl.includes("/keys/"),
    false,
  );
  TestValidator.equals(
    "webhookCallbackUrl does not contain sensitive path segments",
    paymentConfig.webhookCallbackUrl.includes("/secrets/") ||
      paymentConfig.webhookCallbackUrl.includes("/keys/"),
    false,
  );
  // 9. Validate metadata is safe (if present)
  if (paymentConfig.metadata) {
    for (const [key, value] of Object.entries(paymentConfig.metadata)) {
      TestValidator.equals(
        `metadata key '${key}' does not contain sensitive info`,
        key.toLowerCase().includes("secret") ||
          key.toLowerCase().includes("key") ||
          key.toLowerCase().includes("password"),
        false,
      );
      TestValidator.equals(
        `metadata value for key '${key}' does not contain sensitive info`,
        value.toLowerCase().includes("secret") ||
          value.toLowerCase().includes("key") ||
          value.toLowerCase().includes("password"),
        false,
      );
    }
  }
}
