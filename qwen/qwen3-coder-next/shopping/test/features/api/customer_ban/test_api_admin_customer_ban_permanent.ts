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

export async function test_api_admin_customer_ban_permanent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins the platform
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinEmail = typia.random<string & tags.Format<"email">>();
  const adminResponse = await api.functional.ecommerceMall.auth.admin.join(
    adminConnection,
    {
      body: {
        email: adminJoinEmail,
        password: "12345678",
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  typia.assert(adminResponse);
  // 2. Customer joins the platform
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<
    string & tags.MinLength<1> & tags.Format<"email">
  >();
  const customerResponse =
    await api.functional.ecommerceMall.auth.customer.join(customerConnection, {
      body: {
        email: customerEmail,
        password: "12345678",
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: "https://example.com/register",
        referrer: "https://example.com/ref",
        ip: "127.0.0.1",
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customerResponse);
  const customerId = customerResponse.customer.id;
  // 3. Admin authenticates
  const adminAuthConnection: api.IConnection = { host: connection.host };
  const adminAuthResponse = await api.functional.ecommerceMall.auth.admin.login(
    adminAuthConnection,
    {
      body: {
        email: adminJoinEmail,
        password: "12345678",
      } satisfies IEcommerceMallAdmin.ILogin,
    },
  );
  typia.assert(adminAuthResponse);
  // 4. Admin bans the customer
  const banResponse = await api.functional.ecommerceMall.admin.user_bans.create(
    adminAuthConnection,
    {
      body: {
        user_id: customerId,
        user_type: "customer" as const,
        reason: "Violation of terms",
        unban_at: null,
      } satisfies IEcommerceMallUserBan.ICreate,
    },
  );
  typia.assert(banResponse);
  // 5. Validate ban record
  TestValidator.equals(
    "customer user_id matches",
    banResponse.userId,
    customerId,
  );
  TestValidator.equals(
    "user_type is customer",
    banResponse.userType,
    "customer",
  );
  TestValidator.equals(
    "reason is set",
    banResponse.reason,
    "Violation of terms",
  );
  TestValidator.predicate(
    "banned_at is set",
    banResponse.bannedAt !== undefined,
  );
  TestValidator.equals("unban_at is null", banResponse.unbanAt, null);
  TestValidator.equals("is_active is true", banResponse.isActive, true);
  // 6. Customer login attempts are rejected after ban
  await TestValidator.error("customer login rejected after ban", async () => {
    await api.functional.ecommerceMall.auth.customer.login(customerConnection, {
      body: {
        email: customerEmail,
        password: "12345678",
        href: "https://example.com/login",
        referrer: "https://example.com/",
      } satisfies IEcommerceMallCustomer.ILogin,
    });
  });
  // 7. Admin session remains valid after customer ban
  const adminCheckResponse =
    await api.functional.ecommerceMall.auth.admin.login(adminAuthConnection, {
      body: {
        email: adminJoinEmail,
        password: "12345678",
      } satisfies IEcommerceMallAdmin.ILogin,
    });
  typia.assert(adminCheckResponse);
}
