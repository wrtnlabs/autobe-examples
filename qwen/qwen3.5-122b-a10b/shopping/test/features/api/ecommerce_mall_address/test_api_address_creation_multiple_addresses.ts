import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
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
import { prepare_random_ecommerce_mall_address } from "../../../prepare/prepare_random_ecommerce_mall_address";

/**
 * Test customer address creation with multiple addresses.
 * 1. Register a customer
 * 2. Create multiple shipping addresses (home, work, family) without default
 * 3. Verify all addresses are created with unique UUIDs
 * 4. Validate address details match input
 * 5. Verify customer can manage all addresses independently
 */
export async function test_api_address_creation_multiple_addresses(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create multiple addresses without designating any as default
  const homeAddress =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: "Home Recipient",
          phone_number: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 2 }),
          city: "Seoul",
          state_province: "Gyeonggi-do",
          postal_code: "04524",
          country: "South Korea",
          is_default: false,
        } satisfies IEcommerceMallAddress.ICreate,
      },
    );
  typia.assert(homeAddress);
  const workAddress =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: "Work Recipient",
          phone_number: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 2 }),
          city: "Seoul",
          state_province: "Gyeonggi-do",
          postal_code: "06292",
          country: "South Korea",
          is_default: false,
        } satisfies IEcommerceMallAddress.ICreate,
      },
    );
  typia.assert(workAddress);
  const familyAddress =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: "Family Recipient",
          phone_number: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 2 }),
          city: "Busan",
          state_province: "Busan",
          postal_code: "48058",
          country: "South Korea",
          is_default: false,
        } satisfies IEcommerceMallAddress.ICreate,
      },
    );
  typia.assert(familyAddress);
  // 3. Verify all addresses have unique UUIDs
  TestValidator.notEquals(
    "home and work addresses differ",
    homeAddress.id,
    workAddress.id,
  );
  TestValidator.notEquals(
    "home and family addresses differ",
    homeAddress.id,
    familyAddress.id,
  );
  TestValidator.notEquals(
    "work and family addresses differ",
    workAddress.id,
    familyAddress.id,
  );
  // 4. Validate address details match input
  TestValidator.equals(
    "home recipient name",
    homeAddress.recipientName,
    "Home Recipient",
  );
  TestValidator.equals("home city", homeAddress.city, "Seoul");
  TestValidator.equals("home country", homeAddress.country, "South Korea");
  TestValidator.equals("home is not default", homeAddress.isDefault, false);
  TestValidator.equals(
    "work recipient name",
    workAddress.recipientName,
    "Work Recipient",
  );
  TestValidator.equals("work city", workAddress.city, "Seoul");
  TestValidator.equals("work is not default", workAddress.isDefault, false);
  TestValidator.equals(
    "family recipient name",
    familyAddress.recipientName,
    "Family Recipient",
  );
  TestValidator.equals("family city", familyAddress.city, "Busan");
  TestValidator.equals("family is not default", familyAddress.isDefault, false);
  // 5. Verify customer ownership
  TestValidator.equals(
    "home address belongs to customer",
    homeAddress.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "work address belongs to customer",
    workAddress.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "family address belongs to customer",
    familyAddress.customer.id,
    customer.id,
  );
  // 6. Verify all addresses have timestamps
  TestValidator.predicate(
    "home has valid createdAt",
    homeAddress.createdAt.length > 0,
  );
  TestValidator.predicate(
    "work has valid createdAt",
    workAddress.createdAt.length > 0,
  );
  TestValidator.predicate(
    "family has valid createdAt",
    familyAddress.createdAt.length > 0,
  );
  TestValidator.predicate(
    "home has valid updatedAt",
    homeAddress.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "work has valid updatedAt",
    workAddress.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "family has valid updatedAt",
    familyAddress.updatedAt.length > 0,
  );
  // 7. Verify addresses are not deleted
  TestValidator.equals("home address is active", homeAddress.deletedAt, null);
  TestValidator.equals("work address is active", workAddress.deletedAt, null);
  TestValidator.equals(
    "family address is active",
    familyAddress.deletedAt,
    null,
  );
}
