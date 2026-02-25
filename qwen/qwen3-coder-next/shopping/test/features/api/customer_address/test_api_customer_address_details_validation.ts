import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";

export async function test_api_customer_address_details_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create customer-specific connection for authenticated operations
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & (tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>)>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // Create test address with all required fields
  const address = await api.functional.shoppingMall.customer.addresses.create(
    customerConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        street_address: `${randint(100, 9999)} ${RandomGenerator.name()} St`,
        city: RandomGenerator.name(),
        state: RandomGenerator.name(1),
        postal_code: RandomGenerator.alphaNumeric(6),
        country: "South Korea",
      } satisfies IShoppingMallCustomerAddress.ICreate,
    },
  );
  typia.assert(address);
  // Test retrieving the address details
  const retrievedAddress =
    await api.functional.shoppingMall.customer.addresses.at(
      customerConnection,
      {
        addressId: address.id,
      },
    );
  typia.assert(retrievedAddress);
  // Validate address details match original creation
  TestValidator.equals(
    "recipient name matches",
    retrievedAddress.recipientName,
    address.recipientName,
  );
  TestValidator.equals(
    "phone number matches",
    retrievedAddress.phoneNumber,
    address.phoneNumber,
  );
  TestValidator.equals(
    "street address matches",
    retrievedAddress.streetAddress,
    address.streetAddress,
  );
  TestValidator.equals("city matches", retrievedAddress.city, address.city);
  TestValidator.equals("state matches", retrievedAddress.state, address.state);
  TestValidator.equals(
    "postal code matches",
    retrievedAddress.postalCode,
    address.postalCode,
  );
  TestValidator.equals(
    "country matches",
    retrievedAddress.country,
    address.country,
  );
  TestValidator.equals("isDefault false", retrievedAddress.isDefault, false);
  // Validate customer relationship
  TestValidator.equals(
    "customer ID matches",
    retrievedAddress.customer.id,
    address.customer.id,
  );
  TestValidator.equals(
    "customer email matches",
    retrievedAddress.customer.email,
    address.customer.email,
  );
  TestValidator.equals(
    "customer display name matches",
    retrievedAddress.customer.display_name,
    address.customer.display_name,
  );
  // Validate timestamp formats
  TestValidator.predicate(
    "created_at is ISO 8601",
    retrievedAddress.createdAt.match(
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/, 
    ) !== null,
  );
  TestValidator.predicate(
    "updated_at is ISO 8601",
    retrievedAddress.updatedAt.match(
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/, 
    ) !== null,
  );
  TestValidator.predicate(
    "deleted_at is null or ISO 8601",
    retrievedAddress.deletedAt === null ||
      retrievedAddress.deletedAt.match(
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/, 
      ) !== null,
  );
}