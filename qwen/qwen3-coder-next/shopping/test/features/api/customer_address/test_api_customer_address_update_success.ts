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

export async function test_api_customer_address_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
    >(),
    password: "1234",
    display_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
  } satisfies IShoppingMallCustomer.IJoin;
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: joinBody,
  });
  typia.assert(customerAuth);
  // 2. Create shipping address for the customer
  // Since there's no explicit create endpoint provided, we'll create a realistic
  // address update test using the update endpoint which should work with valid address ID
  const updateBody = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    street_address: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(1),
    state: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphabets(6),
    country: "United States",
  } satisfies IShoppingMallCustomerAddress.IUpdate;
  // Since we don't have a create endpoint and need a valid address ID for testing,
  // we'll use the random generated address ID approach to test the success path
  // In real implementation, there would be a POST /shoppingMall/customer/addresses endpoint
  const addressId = typia.random<string & tags.Format<"uuid">>();
  const updatedAddress =
    await api.functional.shoppingMall.customer.addresses.update(
      customerConnection,
      {
        addressId: addressId,
        body: updateBody,
      },
    );
  typia.assert(updatedAddress);
  // 3. Validate the updated address
  TestValidator.equals(
    "recipient name matches",
    updatedAddress.recipientName,
    updateBody.recipient_name,
  );
  TestValidator.equals(
    "phone number matches",
    updatedAddress.phoneNumber,
    updateBody.phone_number,
  );
  TestValidator.equals(
    "street address matches",
    updatedAddress.streetAddress,
    updateBody.street_address,
  );
  TestValidator.equals("city matches", updatedAddress.city, updateBody.city);
  TestValidator.equals("state matches", updatedAddress.state, updateBody.state);
  TestValidator.equals(
    "postal code matches",
    updatedAddress.postalCode,
    updateBody.postal_code,
  );
  TestValidator.equals(
    "country matches",
    updatedAddress.country,
    updateBody.country,
  );
}
