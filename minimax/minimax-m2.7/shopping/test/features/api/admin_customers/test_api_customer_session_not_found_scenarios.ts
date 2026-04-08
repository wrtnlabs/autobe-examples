import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_customer_session_not_found_scenarios(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000/",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Test: Non-existent customer UUID should return 404
  const nonExistentCustomerId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent customer returns 404",
    404,
    async () =>
      await api.functional.ecommerceMall.admin.customers.sessions.at(
        adminConnection,
        {
          customerId: nonExistentCustomerId,
          sessionId: nonExistentSessionId,
        },
      ),
  );
  // 3. Test: Another non-existent customer with different UUID
  const anotherNonExistentCustomerId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "another non-existent customer returns 404",
    404,
    async () =>
      await api.functional.ecommerceMall.admin.customers.sessions.at(
        adminConnection,
        {
          customerId: anotherNonExistentCustomerId,
          sessionId: nonExistentSessionId,
        },
      ),
  );
}
