import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";

/**
 * Test that customers can maintain multiple shipping addresses simultaneously.
 * 1. Register and authenticate a new customer
 * 2. Create three different addresses with distinct recipient information (home, work, family)
 * 3. Do not set any as default
 * 4. Validate all three addresses are created successfully with unique IDs
 * 5. Validate all addresses are associated with the same customer
 * 6. Validate each address retains independent data
 */
export async function test_api_customer_address_multiple_addresses(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerAuth = await authorize_customer_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // Create customer-specific connection with authentication token
  const customerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${customerAuth.token.access}`,
    },
  };
  // 2. Create three distinct addresses (home, work, family)
  const homeAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: "John Home",
          recipientPhone: RandomGenerator.mobile("010"),
          streetAddress: "123 Home Street, Apt 101",
          city: "Seoul",
          state: "Gyeonggi-do",
          postalCode: "06000",
          country: "South Korea",
          isDefault: false,
        } satisfies IShoppingMallAddress.ICreate,
      },
    );
  typia.assert(homeAddress);
  const workAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: "John Work",
          recipientPhone: RandomGenerator.mobile("011"),
          streetAddress: "456 Business Avenue, Floor 5",
          city: "Seoul",
          state: "Gangnam-gu",
          postalCode: "06100",
          country: "South Korea",
          isDefault: false,
        } satisfies IShoppingMallAddress.ICreate,
      },
    );
  typia.assert(workAddress);
  const familyAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: "Jane Family",
          recipientPhone: RandomGenerator.mobile("016"),
          streetAddress: "789 Family Road, House 3",
          city: "Busan",
          state: "Haeundae-gu",
          postalCode: "48000",
          country: "South Korea",
          isDefault: false,
        } satisfies IShoppingMallAddress.ICreate,
      },
    );
  typia.assert(familyAddress);
  // 3. Validate all addresses have unique IDs
  TestValidator.notEquals(
    "home and work IDs differ",
    homeAddress.id,
    workAddress.id,
  );
  TestValidator.notEquals(
    "home and family IDs differ",
    homeAddress.id,
    familyAddress.id,
  );
  TestValidator.notEquals(
    "work and family IDs differ",
    workAddress.id,
    familyAddress.id,
  );
  // 4. Validate all addresses belong to the same customer
  TestValidator.equals(
    "home address customer ID",
    homeAddress.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "work address customer ID",
    workAddress.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "family address customer ID",
    familyAddress.customer.id,
    customerAuth.id,
  );
  // 5. Validate each address has independent recipient information
  TestValidator.notEquals(
    "home recipient name differs",
    homeAddress.recipient_name,
    workAddress.recipient_name,
  );
  TestValidator.notEquals(
    "home recipient name differs",
    homeAddress.recipient_name,
    familyAddress.recipient_name,
  );
  TestValidator.notEquals(
    "work recipient name differs",
    workAddress.recipient_name,
    familyAddress.recipient_name,
  );
  TestValidator.notEquals(
    "home phone differs",
    homeAddress.recipient_phone,
    workAddress.recipient_phone,
  );
  TestValidator.notEquals(
    "home phone differs",
    homeAddress.recipient_phone,
    familyAddress.recipient_phone,
  );
  TestValidator.notEquals(
    "work phone differs",
    workAddress.recipient_phone,
    familyAddress.recipient_phone,
  );
  // 6. Validate each address has independent location data
  TestValidator.notEquals(
    "home street differs",
    homeAddress.street_address,
    workAddress.street_address,
  );
  TestValidator.notEquals(
    "home city differs",
    homeAddress.city,
    familyAddress.city,
  );
  TestValidator.notEquals(
    "work state differs",
    workAddress.state,
    familyAddress.state,
  );
  // 7. Validate none are set as default
  TestValidator.predicate(
    "home is not default",
    () => homeAddress.is_default === false,
  );
  TestValidator.predicate(
    "work is not default",
    () => workAddress.is_default === false,
  );
  TestValidator.predicate(
    "family is not default",
    () => familyAddress.is_default === false,
  );
}
