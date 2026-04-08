import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_addresses_create";
import { prepare_random_ecommerce_mall_customer } from "../../../prepare/prepare_random_ecommerce_mall_customer";

export async function test_api_customer_address_multiple_types(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new customer account using authorize_customer_join utility
  const customerConnection: api.IConnection = { host: connection.host };
  const authorizedCustomer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://test.com/register",
      referrer: "https://test.com/home",
    },
  });
  typia.assert(authorizedCustomer);
  // Step 2: Create a home address (should be default)
  const homeAddress =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phoneNumber: RandomGenerator.mobile(),
          streetAddress: "123 Home Street, Apartment 1A",
          city: "New York",
          state: "NY",
          postalCode: "10001",
          country: "USA",
        },
      },
    );
  typia.assert(homeAddress);
  // Validate home address is marked as default (first address = default)
  TestValidator.predicate(
    "home address is default",
    homeAddress.isDefault === true,
  );
  TestValidator.predicate(
    "home address has valid city",
    homeAddress.city === "New York",
  );
  // Step 3: Create a work address with business recipient information
  const workAddress =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: "Office Manager",
          phoneNumber: RandomGenerator.mobile("011"),
          streetAddress: "123 Business Plaza, Suite 500",
          city: "San Francisco",
          state: "CA",
          postalCode: "94105",
          country: "USA",
        },
      },
    );
  typia.assert(workAddress);
  // Validate work address fields and default status
  TestValidator.equals(
    "work recipient name matches",
    workAddress.recipientName,
    "Office Manager",
  );
  TestValidator.equals(
    "work street address matches",
    workAddress.streetAddress,
    "123 Business Plaza, Suite 500",
  );
  TestValidator.predicate(
    "work address is not default",
    workAddress.isDefault === false,
  );
  // Step 4: Create a gift address with third-party recipient information
  const giftAddress =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phoneNumber: RandomGenerator.mobile("016"),
          streetAddress: "Gift Delivery Center, Building A",
          city: "Chicago",
          state: "IL",
          postalCode: "60601",
          country: "USA",
        },
      },
    );
  typia.assert(giftAddress);
  // Validate gift address fields
  TestValidator.equals("gift city matches", giftAddress.city, "Chicago");
  TestValidator.predicate(
    "gift address is not default",
    giftAddress.isDefault === false,
  );
  // Step 5: Validate all three addresses have distinct UUIDs
  TestValidator.notEquals(
    "home and work IDs differ",
    homeAddress.id,
    workAddress.id,
  );
  TestValidator.notEquals(
    "home and gift IDs differ",
    homeAddress.id,
    giftAddress.id,
  );
  TestValidator.notEquals(
    "work and gift IDs differ",
    workAddress.id,
    giftAddress.id,
  );
  // Step 6: Validate default flag behavior - only home is default
  TestValidator.predicate(
    "only home address has isDefault=true",
    homeAddress.isDefault && !workAddress.isDefault && !giftAddress.isDefault,
  );
}
