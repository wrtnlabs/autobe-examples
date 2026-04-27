import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerAddress";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_e_commerce_mall_customer_addresses_create } from "../../../generate/generate_random_e_commerce_mall_customer_addresses_create";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";

export async function test_api_super_administrator_customer_address_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a regular administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Promote the regular administrator to super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        administrator_id: admin.id,
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(superAdmin);
  // 3. Register a customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 4. Create a shipping address for the customer
  const address =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 5. Super administrator retrieves the customer's address
  const retrieved =
    await api.functional.eCommerceMall.superAdministrator.customers.addresses.at(
      superAdminConnection,
      {
        customerId: customer.id,
        addressId: address.id,
      },
    );
  typia.assert(retrieved);
  // 6. Validate all address fields match
  TestValidator.equals("address id", retrieved.id, address.id);
  TestValidator.equals(
    "recipient name",
    retrieved.recipient_name,
    address.recipient_name,
  );
  TestValidator.equals(
    "phone number",
    retrieved.phone_number,
    address.phone_number,
  );
  TestValidator.equals(
    "street address",
    retrieved.street_address,
    address.street_address,
  );
  TestValidator.equals("city", retrieved.city, address.city);
  TestValidator.equals(
    "state province",
    retrieved.state_province,
    address.state_province,
  );
  TestValidator.equals(
    "postal code",
    retrieved.postal_code,
    address.postal_code,
  );
  TestValidator.equals("country", retrieved.country, address.country);
  TestValidator.equals("is default", retrieved.is_default, address.is_default);
  TestValidator.equals("created at", retrieved.created_at, address.created_at);
  TestValidator.equals("updated at", retrieved.updated_at, address.updated_at);
  // 7. Validate customer summary embedded in address
  TestValidator.equals("customer id", retrieved.customer.id, customer.id);
  TestValidator.equals(
    "customer email",
    retrieved.customer.email,
    customer.email,
  );
  // 8. Verify customer summary profile exists (active customer, not deleted)
  typia.assertGuard(retrieved.customer.profile!);
  TestValidator.equals(
    "customer profile display name",
    retrieved.customer.profile.display_name,
    customer.profile.display_name,
  );
  TestValidator.equals(
    "customer profile phone number",
    retrieved.customer.profile.phone_number,
    customer.profile.phone_number,
  );
}
