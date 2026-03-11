import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminActionLog";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_admin_action_log_retrieval_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as a customer user
  const customerConnection: api.IConnection = { host: connection.host };
  const customerName = RandomGenerator.name();
  const customerEmail = typia.random<string & tags.Format<"email">>();
  await authorize_customer_join(customerConnection, {
    body: {
      email: (customerEmail ?? "") satisfies string as string,
      password: "12345678",
      name: customerName,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 2. Login as customer to get valid session
  const customerLoginResponse =
    await api.functional.ecommerceMall.auth.customer.login(customerConnection, {
      body: {
        email: (customerEmail ?? "") satisfies string as string,
        password: "12345678",
        href: "https://example.com/login",
        referrer: "https://example.com",
      } satisfies IEcommerceMallCustomer.ILogin,
    });
  typia.assert(customerLoginResponse);
  // 3. Attempt to retrieve admin action log as customer (should fail with 403)
  // Create a dummy log ID for testing (any UUID is fine since auth check happens first)
  const dummyLogId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "customer should not access admin action logs",
    async () => {
      await api.functional.ecommerceMall.admin.admin_action_logs.at(
        customerConnection,
        {
          logId: dummyLogId,
        },
      );
    },
  );
}
