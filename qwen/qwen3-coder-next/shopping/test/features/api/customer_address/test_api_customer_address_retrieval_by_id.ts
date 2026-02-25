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

export async function test_api_customer_address_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection and register
  const customerConnection: api.IConnection = { host: connection.host };
  const emailValue: string = typia.random<string & tags.Format<"email">>();
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: (emailValue ?? "") satisfies string as string,
      password: "1234",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Create a new shipping address for the customer using utility function
  const createdAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: "John Doe",
          phone_number: "01012345678",
          street_address: "123 Main Street",
          city: "Seoul",
          state: "Seoul",
          postal_code: "01234",
          country: "South Korea",
        } satisfies IShoppingMallCustomerAddress.ICreate,
      },
    );
  typia.assert(createdAddress);
  // Retrieve the created address by ID
  const retrievedAddress =
    await api.functional.shoppingMall.customer.addresses.at(
      customerConnection,
      {
        addressId: createdAddress.id,
      },
    );
  typia.assert(retrievedAddress);
  // Validate that the retrieved address matches the created address
  TestValidator.equals(
    "address ID matches",
    retrievedAddress.id,
    createdAddress.id,
  );
  TestValidator.equals(
    "recipient name matches",
    retrievedAddress.recipientName,
    createdAddress.recipientName,
  );
  TestValidator.equals(
    "phone number matches",
    retrievedAddress.phoneNumber,
    createdAddress.phoneNumber,
  );
  TestValidator.equals(
    "street address matches",
    retrievedAddress.streetAddress,
    createdAddress.streetAddress,
  );
  TestValidator.equals(
    "city matches",
    retrievedAddress.city,
    createdAddress.city,
  );
  TestValidator.equals(
    "state matches",
    retrievedAddress.state,
    createdAddress.state,
  );
  TestValidator.equals(
    "postal code matches",
    retrievedAddress.postalCode,
    createdAddress.postalCode,
  );
  TestValidator.equals(
    "country matches",
    retrievedAddress.country,
    createdAddress.country,
  );
  TestValidator.equals(
    "isDefault flag matches",
    retrievedAddress.isDefault,
    createdAddress.isDefault,
  );
  // Validate customer summary is present
  TestValidator.notEquals(
    "customer summary exists",
    retrievedAddress.customer,
    null,
  );
  TestValidator.equals(
    "customer ID matches",
    retrievedAddress.customer.id,
    customer.id,
  );
}