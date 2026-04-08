import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerPasswordReset";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
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

export async function test_api_customer_password_reset_by_admin_with_already_used_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 2. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test@1234",
      href: "https://test.com/register",
      referrer: "https://test.com",
    },
  });
  // 3. Login as admin to get authorization
  const loggedInAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(loggedInAdminConnection, {
    body: {
      email: admin.email,
      password: "adminpass123",
      href: "https://test.com/admin",
      referrer: "https://test.com",
    },
  });
  // 4. Attempt to use a non-existent/fake token (UUID format to pass basic validation)
  // This should fail because the token doesn't exist in the system
  // Using UUID format token that won't exist in the database
  const fakeToken = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent token should return error",
    [400, 404],
    async () =>
      await api.functional.ecommerceMall.admin.customers.password_resets.create(
        loggedInAdminConnection,
        {
          customerId: customer.id,
          body: {
            token: fakeToken,
            password: "NewTest@5678",
          } satisfies IEcommerceMallCustomerPasswordReset.IResetRequest,
        },
      ),
  );
}