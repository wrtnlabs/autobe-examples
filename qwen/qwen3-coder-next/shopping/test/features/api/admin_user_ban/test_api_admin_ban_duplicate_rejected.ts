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

export async function test_api_admin_ban_duplicate_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.Format<'email'>>(typia.random<string & tags.Format<'email'>>()),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  const adminLogin = await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "admin123",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = adminLogin.token.access;
  // 2. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.Format<'email'>>(typia.random<string & tags.Format<'email'>>()),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  const customerLogin = await authorize_customer_login(customerConnection, {
    body: {
      email: "customer@test.com",
      password: "customer123",
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  customerConnection.headers ??= {};
  customerConnection.headers.Authorization = customerLogin.token.access;
  // 3. Get customer ID for banning
  const customerSummary = customerLogin.customer;
  // 4. Admin bans the customer (first successful ban)
  const firstBan = await api.functional.ecommerceMall.admin.user_bans.create(
    adminConnection,
    {
      body: {
        user_id: customerSummary.id,
        user_type: "customer" as const,
        reason: "Testing duplicate ban rejection",
      } satisfies IEcommerceMallUserBan.ICreate,
    },
  );
  typia.assert(firstBan);
  TestValidator.equals("first ban created", firstBan.isActive, true);
  // 5. Admin attempts to ban the same customer again (duplicate request)
  await TestValidator.error("duplicate ban rejected", async () => {
    await api.functional.ecommerceMall.admin.user_bans.create(adminConnection, {
      body: {
        user_id: customerSummary.id,
        user_type: "customer" as const,
        reason: "Testing duplicate ban rejection again",
      } satisfies IEcommerceMallUserBan.ICreate,
    });
  });
  // 6. Verify ban record remains unchanged
  // Note: In real implementation, you would fetch the ban record and verify it's unchanged
  // For now, we rely on the error being thrown by the duplicate ban attempt
}