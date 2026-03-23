import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
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
import { generate_random_ecommerce_mall_admin_user_bans_create } from "../../../generate/generate_random_ecommerce_mall_admin_user_bans_create";
import { prepare_random_ecommerce_mall_user_ban } from "../../../prepare/prepare_random_ecommerce_mall_user_ban";

export async function test_api_customer_login_suspended_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const registeredCustomer =
    await api.functional.ecommerceMall.auth.customer.join(customerConnection, {
      body: {
        email: (typia.random<string & tags.Format<"email">>() satisfies string as string),
        password: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: window.location.href,
        referrer: document.referrer,
        ip: "127.0.0.1",
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(registeredCustomer);
  // 2. Setup admin account to suspend customer
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.admin.join(adminConnection, {
    body: {
      email: (typia.random<string & tags.Format<"email">>() satisfies string as string),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 3. Login as admin
  const adminLoginResult = await api.functional.ecommerceMall.auth.admin.login(
    adminConnection,
    {
      body: {
        email:
          (adminConnection.headers?.Authorization?.toString() ?? "")
            .replace("Bearer ", "")
            .split(".")[0] ?? "admin@test.com",
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEcommerceMallAdmin.ILogin,
    },
  );
  typia.assert(adminLoginResult);
  // 4. Suspend the customer account
  const suspendResponse =
    await api.functional.ecommerceMall.admin.user_bans.create(adminConnection, {
      body: {
        user_id: registeredCustomer.customer.id,
        user_type: "customer" as const,
        reason: "Test suspension for blocked login scenario",
        unban_at: null,
      } satisfies IEcommerceMallUserBan.ICreate,
    });
  typia.assert(suspendResponse);
  // 5. Attempt login again with suspended customer - should fail
  await TestValidator.error(
    "login should fail for suspended account",
    async () => {
      await api.functional.ecommerceMall.auth.customer.login(
        customerConnection,
        {
          body: {
            email: registeredCustomer.customer.email,
            password: "password123",
            href: window.location.href,
            referrer: document.referrer,
            ip: "127.0.0.1",
          } satisfies IEcommerceMallCustomer.ILogin,
        },
      );
    },
  );
  // 6. Verify customer is marked as suspended
  TestValidator.equals(
    "customer should be suspended",
    registeredCustomer.customer.is_suspended,
    true,
  );
}