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

export async function test_api_payment_config_mode_switch_with_health_check(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin account via join request
  const adminJoinConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminJoinConnection, {
    body: {
      actorType: "customer",
      requestedGrade: "admin",
      reason:
        "Need admin access for payment config testing with proper justification text here for testing",
      href: "https://example.com/admin/payments",
      referrer: "https://example.com/admin",
    },
  });
  // 2. Create admin connection and login with test credentials
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "password1234",
      href: "https://example.com/admin/payments",
      referrer: "https://example.com/admin",
    },
  });
  // 3. Switch payment gateway from test mode to production mode with new credentials
  const productionEndpoint =
    "https://api.production-gateway.example.com/v2" as string &
      tags.Format<"uri">;
  const productionApiKey = "prod_sk_live_1234567890abcdef" as string &
    tags.Format<"password">;
  const productionMerchantId =
    "merchant_prod_" + RandomGenerator.alphaNumeric(8);
  const config =
    await api.functional.ecommerceMall.admin.payments.config.update(
      adminConnection,
      {
        body: {
          apiEndpoint: productionEndpoint,
          apiKey: productionApiKey,
          merchantId: productionMerchantId,
          mode: "production",
        } satisfies IEcommerceMallPaymentConfig.IUpdate,
      },
    );
  typia.assert(config);
  // 4. Validate the response reflects production mode and new credentials
  TestValidator.equals("mode is production", config.mode, "production");
  TestValidator.equals(
    "apiEndpoint updated",
    config.apiEndpoint,
    productionEndpoint,
  );
  TestValidator.equals(
    "merchantId updated",
    config.merchantId,
    productionMerchantId,
  );
  TestValidator.predicate("isActive is true", config.isActive === true);
  TestValidator.predicate(
    "updatedAt is set",
    config.updatedAt !== undefined && config.updatedAt.length > 0,
  );
}