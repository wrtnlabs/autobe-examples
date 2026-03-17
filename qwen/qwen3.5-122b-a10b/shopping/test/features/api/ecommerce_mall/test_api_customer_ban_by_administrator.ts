import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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

/**
 * Test administrator banning a customer account.
 *
 * This test verifies the complete customer ban workflow:
 * 1. Create administrator account and authenticate
 * 2. Create customer account with active status
 * 3. Administrator bans the customer
 * 4. Verify customer status changes to 'banned'
 * 5. Verify deleted_at remains null (ban ≠ deletion)
 * 6. Verify customer cannot login after ban
 * 7. Verify updated_at timestamp is updated
 */
export async function test_api_customer_ban_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(adminEmail),
      password: typia.assert<string & tags.MinLength<8> & tags.MaxLength<128>>(adminPassword),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create customer with active status
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword: string = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(customerEmail),
      password: typia.assert<string & tags.MinLength<8> & tags.MaxLength<128>>(customerPassword),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // Verify initial customer status is 'active'
  TestValidator.equals(
    "initial account status",
    customerAuth.account_status,
    "active",
  );
  TestValidator.equals("initial deleted_at", customerAuth.deleted_at, null);
  const customerId: string & tags.Format<"uuid"> = customerAuth.id;
  const createdAt: string & tags.Format<"date-time"> = customerAuth.created_at;
  // 3. Administrator bans the customer
  const bannedCustomer: IEcommerceMallCustomer =
    await api.functional.ecommerceMall.admin.customers.ban(adminConnection, {
      customerId,
    });
  typia.assert(bannedCustomer);
  // 4. Verify customer status changed to 'banned'
  TestValidator.equals(
    "account status after ban",
    bannedCustomer.account_status,
    "banned",
  );
  TestValidator.equals("customer ID preserved", bannedCustomer.id, customerId);
  TestValidator.equals("email preserved", bannedCustomer.email, customerEmail);
  TestValidator.equals(
    "display name preserved",
    bannedCustomer.display_name,
    customerAuth.display_name,
  );
  TestValidator.equals(
    "phone number preserved",
    bannedCustomer.phone_number,
    customerAuth.phone_number,
  );
  // 5. Verify deleted_at remains null (ban ≠ deletion)
  TestValidator.equals(
    "deleted_at remains null",
    bannedCustomer.deleted_at,
    null,
  );
  // 6. Verify updated_at is updated (different from created_at)
  TestValidator.notEquals(
    "updated_at changed",
    bannedCustomer.updated_at,
    createdAt,
  );
  // 7. Verify customer cannot login after ban
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "customer cannot login after ban",
    403,
    async () => {
      await api.functional.ecommerceMall.auth.customer.login.signIn(
        loginConnection,
        {
          body: {
            email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(customerEmail),
            password: typia.assert<string & tags.MinLength<8> & tags.MaxLength<128>>(customerPassword),
          } satisfies IEcommerceMallCustomer.ILogin,
        },
      );
    },
  );
}