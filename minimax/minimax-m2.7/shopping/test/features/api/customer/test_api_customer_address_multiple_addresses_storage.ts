import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_customer_address_multiple_addresses_storage(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Create a home address
  const homeAddress =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          streetAddress: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} Main Street`,
          city: "Seoul",
          state: "Gangnam-gu",
          postalCode: "06000",
          country: "South Korea",
          isDefault: true,
        },
      },
    );
  typia.assert(homeAddress);
  // 3. Verify home address created successfully
  TestValidator.predicate(
    "home address has valid UUID",
    homeAddress.id.length > 0,
  );
  TestValidator.predicate(
    "home address has recipient name",
    homeAddress.recipient_name.length > 0,
  );
  TestValidator.equals("home address city is Seoul", homeAddress.city, "Seoul");
  TestValidator.equals(
    "home address country is South Korea",
    homeAddress.country,
    "South Korea",
  );
  TestValidator.equals("home address is default", homeAddress.is_default, true);
  TestValidator.equals(
    "home address not deleted",
    homeAddress.deleted_at,
    null,
  );
  // 4. Create a work address with different details
  const workAddress =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          streetAddress: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} Business District`,
          city: "Seoul",
          state: "Jung-gu",
          postalCode: "04512",
          country: "South Korea",
          isDefault: false,
        },
      },
    );
  typia.assert(workAddress);
  // 5. Verify work address created successfully
  TestValidator.predicate(
    "work address has valid UUID",
    workAddress.id.length > 0,
  );
  TestValidator.predicate(
    "work address has recipient name",
    workAddress.recipient_name.length > 0,
  );
  TestValidator.equals("work address city is Seoul", workAddress.city, "Seoul");
  TestValidator.equals(
    "work address country is South Korea",
    workAddress.country,
    "South Korea",
  );
  TestValidator.equals(
    "work address is not default",
    workAddress.is_default,
    false,
  );
  TestValidator.equals(
    "work address not deleted",
    workAddress.deleted_at,
    null,
  );
  // 6. Verify both addresses have different UUIDs
  TestValidator.notEquals(
    "addresses have different UUIDs",
    homeAddress.id,
    workAddress.id,
  );
  // 7. Verify both addresses are associated with the same customer
  TestValidator.equals(
    "home address customer ID matches authorized customer",
    homeAddress.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "work address customer ID matches authorized customer",
    workAddress.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "both addresses belong to same customer",
    homeAddress.customer.id,
    workAddress.customer.id,
  );
  // 8. Verify addresses appear in the customer's address list
  TestValidator.predicate(
    "authorized response has addresses",
    authorized.addresses.length >= 2,
  );
  TestValidator.equals(
    "home address exists in authorized addresses",
    authorized.addresses.some((addr) => addr.id === homeAddress.id),
    true,
  );
  TestValidator.equals(
    "work address exists in authorized addresses",
    authorized.addresses.some((addr) => addr.id === workAddress.id),
    true,
  );
}
