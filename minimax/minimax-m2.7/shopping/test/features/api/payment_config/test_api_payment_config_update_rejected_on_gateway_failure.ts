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

export async function test_api_payment_config_update_rejected_on_gateway_failure(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account via join
  const joinConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(joinConnection, {
    body: {
      actorType: "customer",
      requestedGrade: "admin",
      reason: RandomGenerator.paragraph({ sentences: 5 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Login as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = "TestPassword123!" satisfies string &
    tags.Format<"password">;
  await authorize_admin_login(adminConnection, {
    body: {
      email: email,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 3. Attempt to update payment config with unreachable gateway endpoint
  // This should fail because the gateway health check cannot verify connectivity
  await TestValidator.error(
    "payment config update rejected on gateway failure",
    async () => {
      await api.functional.ecommerceMall.admin.payments.config.update(
        adminConnection,
        {
          body: {
            gatewayName: "stripe",
            apiEndpoint: "https://invalid-unreachable-gateway.example.com/api",
            apiKey: "sk_test_invalid_key_that_will_not_connect",
            mode: "test",
          } satisfies IEcommerceMallPaymentConfig.IUpdate,
        },
      );
    },
  );
}
