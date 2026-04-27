import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerAddress";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
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
import { generate_random_e_commerce_mall_customer_addresses_create } from "../../../generate/generate_random_e_commerce_mall_customer_addresses_create";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";

export async function test_api_administrator_retrieve_customer_active_address(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 3. Customer creates a shipping address with explicit fields
  const address =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: "John Doe",
          phone_number: "+1-555-123-4567",
          street_address: "123 Main Street, Apt 4B",
          city: "San Francisco",
          state_province: "California",
          postal_code: "94102",
          country: "United States",
          is_default: true,
        } satisfies IECommerceMallCustomerAddress.ICreate,
      },
    );
  typia.assert(address);
  // 4. Administrator retrieves the customer's address
  const retrieved =
    await api.functional.eCommerceMall.administrator.customers.addresses.at(
      adminConnection,
      {
        customerId: customerAuth.id,
        addressId: address.id,
      },
    );
  typia.assert(retrieved);
  // 5. Validate all fields match
  TestValidator.equals("customer id", retrieved.customer.id, customerAuth.id);
  TestValidator.equals(
    "customer email",
    retrieved.customer.email,
    customerAuth.email,
  );
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
    "state/province",
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
  TestValidator.predicate(
    "has created_at",
    typeof retrieved.created_at === "string",
  );
  TestValidator.predicate(
    "has updated_at",
    typeof retrieved.updated_at === "string",
  );
}
