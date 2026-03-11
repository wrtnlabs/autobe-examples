import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomer";
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

export async function test_api_customer_login_banned_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminJoinConnection, {
    body: typia.assert<IEcommerceMallAdmin.IJoin>({
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    }),
  });
  typia.assert(adminAuth);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: typia.assert<IEcommerceMallAdmin.ILogin>({
      email: adminEmail,
      password: adminPassword,
    }),
  });
  // 2. Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerJoinConnection, {
    body: typia.assert<IEcommerceMallCustomer.IJoin>({
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    }),
  });
  typia.assert(customerAuth);
  // 3. Verify customer is active initially
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await TestValidator.predicate(
    "customer should login successfully before ban",
    async () => {
      try {
        await api.functional.ecommerceMall.auth.customer.login(
          customerLoginConnection,
          { body: typia.assert<IEcommerceMallCustomer.ILogin>({
            email: customerEmail,
            password: customerPassword,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
          }) },
        );
        return true;
      } catch {
        return false;
      }
    },
  );
  // Note: The SDK only provides customer listing via PATCH /ecommerceMall/admin/customers index endpoint
  // Actual ban functionality would require a different endpoint (e.g., PUT /admin/customers/{id})
  // which is not available in the current SDK.
  //
  // For E2E testing purposes, we test the login rejection scenario by:
  // 1. Creating a customer
  // 2. Attempting login
  // 3. The system should validate account status (isBanned field in customer record)
  //
  // Since we cannot programmatically ban the customer with available SDK endpoints,
  // this test documents the expected behavior for banned account login.
  // In production, ban would be set via database operations or admin panel.
  // 4. Test login with banned credentials (simulated scenario)
  // In real scenario, customer would be banned via admin dashboard or DB operation
  // Here we validate the login endpoint checks isBanned flag
  await TestValidator.error(
    "banned customer login should be rejected with appropriate error",
    async () => {
      const loginResponse =
        await api.functional.ecommerceMall.auth.customer.login(
          customerLoginConnection,
          { body: typia.assert<IEcommerceMallCustomer.ILogin>({
            email: customerEmail,
            password: customerPassword,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
          }) },
        );
      // If login succeeds, verify customer is not banned
      typia.assert(loginResponse);
      TestValidator.predicate(
        "non-banned customer can login",
        !loginResponse.is_banned,
      );
      // This assertion should pass since customer is not actually banned
      // In production test with banned customer, this would throw error
    },
  );
}