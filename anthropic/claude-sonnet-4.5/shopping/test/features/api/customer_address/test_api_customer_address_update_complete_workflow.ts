import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test the complete workflow of a customer updating their delivery address.
 *
 * This test validates the entire customer address management flow:
 *
 * 1. Customer registration and authentication
 * 2. Initial address creation with complete information
 * 3. Address update with modified recipient name
 * 4. Verification that the address was correctly updated
 *
 * The test ensures customers can maintain accurate delivery information as
 * their circumstances change, validating proper authentication, address
 * creation, and address modification capabilities.
 */
export async function test_api_customer_address_update_complete_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create new customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = typia.random<string & tags.MinLength<8>>();
  const customerName = RandomGenerator.name();

  const customerCreateBody = {
    email: customerEmail,
    password: customerPassword,
    name: customerName,
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  const authorizedCustomer = await api.functional.auth.customer.join(
    connection,
    {
      body: customerCreateBody,
    },
  );
  typia.assert(authorizedCustomer);

  TestValidator.equals(
    "customer email matches",
    authorizedCustomer.email,
    customerEmail,
  );
  TestValidator.equals(
    "customer name matches",
    authorizedCustomer.name,
    customerName,
  );

  // Step 2: Create initial delivery address
  const initialRecipientName = RandomGenerator.name();

  const addressCreateBody = {
    recipient_name: initialRecipientName,
    phone_number: RandomGenerator.mobile(),
    address_line1: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 7,
    }),
    city: "Seoul",
    state_province: "Seoul",
    postal_code: typia
      .random<
        number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    country: "South Korea",
  } satisfies IShoppingMallAddress.ICreate;

  const createdAddress =
    await api.functional.shoppingMall.customer.addresses.create(connection, {
      body: addressCreateBody,
    });
  typia.assert(createdAddress);

  TestValidator.equals(
    "initial recipient name matches",
    createdAddress.recipient_name,
    initialRecipientName,
  );

  // Step 3: Update the address with new recipient name
  const updatedRecipientName = RandomGenerator.name();

  const addressUpdateBody = {
    recipient_name: updatedRecipientName,
    city: "Busan",
  } satisfies IShoppingMallAddress.IUpdate;

  const updatedAddress =
    await api.functional.shoppingMall.customer.addresses.update(connection, {
      addressId: createdAddress.id,
      body: addressUpdateBody,
    });
  typia.assert(updatedAddress);

  // Step 4: Validate the address was correctly updated
  TestValidator.equals(
    "address ID remains the same",
    updatedAddress.id,
    createdAddress.id,
  );
  TestValidator.equals(
    "recipient name was updated",
    updatedAddress.recipient_name,
    updatedRecipientName,
  );
  TestValidator.notEquals(
    "recipient name changed from initial",
    updatedAddress.recipient_name,
    initialRecipientName,
  );
}
