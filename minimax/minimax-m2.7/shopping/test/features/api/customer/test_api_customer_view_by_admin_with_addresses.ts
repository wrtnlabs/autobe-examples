import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_customer_view_by_admin_with_addresses(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Register a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Create a shipping address for the customer
  const address =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          streetAddress: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<999>>()} ${RandomGenerator.alphabets(8)} Street`,
          city: RandomGenerator.name(1),
          state: RandomGenerator.name(1),
          postalCode: String(
            typia.random<
              number &
                tags.Type<"uint32"> &
                tags.Minimum<10000> &
                tags.Maximum<99999>
            >(),
          ),
          country: "United States",
          isDefault: true,
        },
      },
    );
  typia.assert(address);
  // 4. Call admin customer detail endpoint
  const customerDetail = await api.functional.ecommerceMall.admin.customers.at(
    adminConnection,
    {
      customerId: customerAuth.id,
    },
  );
  typia.assert(customerDetail);
  // 5. Validate response
  TestValidator.equals(
    "customer id matches",
    customerDetail.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "email matches",
    customerDetail.email,
    customerAuth.email,
  );
  TestValidator.predicate(
    "profile exists",
    customerDetail.profile !== undefined,
  );
  TestValidator.equals(
    "profile displayName",
    customerDetail.profile.displayName,
    customerAuth.profile.displayName,
  );
  TestValidator.equals(
    "profile phone",
    customerDetail.profile.phone,
    customerAuth.profile.phone,
  );
  TestValidator.predicate(
    "created_at exists",
    customerDetail.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    customerDetail.updated_at !== undefined,
  );
  TestValidator.equals("addresses count", customerDetail.addresses.length, 1);
  TestValidator.equals(
    "address id matches",
    customerDetail.addresses[0].id,
    address.id,
  );
  TestValidator.equals(
    "recipient name matches",
    customerDetail.addresses[0].recipientName,
    address.recipient_name,
  );
  TestValidator.equals(
    "phone matches",
    customerDetail.addresses[0].phone,
    address.phone,
  );
  TestValidator.equals(
    "street address matches",
    customerDetail.addresses[0].streetAddress,
    address.street_address,
  );
  TestValidator.equals(
    "city matches",
    customerDetail.addresses[0].city,
    address.city,
  );
  TestValidator.equals(
    "state matches",
    customerDetail.addresses[0].state,
    address.state,
  );
  TestValidator.equals(
    "postal code matches",
    customerDetail.addresses[0].postalCode,
    address.postal_code,
  );
  TestValidator.equals(
    "country matches",
    customerDetail.addresses[0].country,
    address.country,
  );
  TestValidator.equals(
    "is default flag",
    customerDetail.addresses[0].isDefault,
    true,
  );
}
