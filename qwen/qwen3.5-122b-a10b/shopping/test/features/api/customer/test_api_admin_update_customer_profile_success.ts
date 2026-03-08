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

export async function test_api_admin_update_customer_profile_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>());
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create customer account to update
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>());
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const initialDisplayName = RandomGenerator.name();
  const initialPhoneNumber = RandomGenerator.mobile();
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      display_name: initialDisplayName,
      phone_number: initialPhoneNumber,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // Store original customer data for validation
  const originalCustomerId = customerAuth.id;
  const originalEmail = customerAuth.email;
  const originalUpdatedAt = customerAuth.updated_at;
  // 3. Admin updates customer profile with new display_name and phone_number
  const newDisplayName = RandomGenerator.name(3);
  const newPhoneNumber = RandomGenerator.mobile("011");
  const updatedCustomer: IEcommerceMallCustomer =
    await api.functional.ecommerceMall.admin.customers.update(adminConnection, {
      customerId: originalCustomerId,
      body: {
        display_name: newDisplayName,
        phone_number: newPhoneNumber,
      } satisfies IEcommerceMallCustomer.IUpdate,
    });
  typia.assert(updatedCustomer);
  // 4. Validate all expected changes
  TestValidator.equals(
    "customer ID unchanged",
    updatedCustomer.id,
    originalCustomerId,
  );
  TestValidator.equals("email unchanged", updatedCustomer.email, originalEmail);
  TestValidator.equals(
    "display name updated",
    updatedCustomer.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "phone number updated",
    updatedCustomer.phone_number,
    newPhoneNumber,
  );
  TestValidator.predicate(
    "updated_at modified",
    updatedCustomer.updated_at !== originalUpdatedAt,
  );
  TestValidator.predicate(
    "account status active",
    updatedCustomer.account_status === "active",
  );
  TestValidator.predicate(
    "created_at preserved",
    updatedCustomer.created_at !== null,
  );
  TestValidator.predicate(
    "deleted_at is null",
    updatedCustomer.deleted_at === null,
  );
  // 5. Customer can view updated profile by logging in with original credentials
  const customerLogin = await authorize_customer_login(customerConnection, {
    body: {
      email: originalEmail,
      password: customerPassword,
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  typia.assert(customerLogin);
  TestValidator.equals(
    "customer sees updated display name",
    customerLogin.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "customer sees updated phone number",
    customerLogin.phone_number,
    newPhoneNumber,
  );
}