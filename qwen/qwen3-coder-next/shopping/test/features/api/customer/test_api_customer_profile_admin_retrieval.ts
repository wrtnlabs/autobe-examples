import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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

export async function test_api_customer_profile_admin_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234!@#$",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create customer to test retrieval
  const customerEmail = RandomGenerator.alphabets(10) + "@test.com";
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: "1234!@#$",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 3. Admin retrieves customer profile
  const retrievedCustomer =
    await api.functional.shoppingMall.admin.customers.at(adminConnection, {
      customerId: customer.id,
    });
  typia.assert(retrievedCustomer);
  // 4. Validate customer profile fields
  TestValidator.equals("id matches", retrievedCustomer.id, customer.id);
  TestValidator.equals(
    "email matches",
    retrievedCustomer.email,
    customer.email,
  );
  TestValidator.equals(
    "display_name matches",
    retrievedCustomer.display_name,
    customer.display_name,
  );
  TestValidator.equals(
    "phone_number matches",
    retrievedCustomer.phone_number,
    customer.phone_number,
  );
  TestValidator.equals(
    "email_verified is false",
    retrievedCustomer.email_verified,
    false,
  );
  TestValidator.equals(
    "created_at is valid date-time",
    retrievedCustomer.created_at !== null && retrievedCustomer.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "updated_at is valid date-time",
    retrievedCustomer.updated_at !== null && retrievedCustomer.updated_at !== undefined,
    true,
  );
  TestValidator.equals(
    "deleted_at is null",
    retrievedCustomer.deleted_at,
    null,
  );
  // 5. Test retrieval of soft-deleted customer
  await api.functional.shoppingMall.admin.customers.at(adminConnection, {
    customerId: customer.id,
  });
}