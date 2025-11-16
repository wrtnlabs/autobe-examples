import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";

/**
 * Test creating a new delivery address with all fields populated including
 * optional fields.
 *
 * This scenario validates the complete address creation workflow with
 * comprehensive address information. Authenticate as buyer, then create an
 * address providing all required fields (recipient_name, phone,
 * street_address_line1, city, postal_code, country, address_label,
 * address_type) and optional fields (street_address_line2, state,
 * special_delivery_instructions). Verify that the created address includes all
 * submitted information with correct field values. Validate that the address
 * receives a generated UUID id, automatic buyer_id association from
 * authentication token, and proper timestamps (created_at, updated_at). Test
 * that the address is immediately available for order checkout.
 *
 * Steps:
 *
 * 1. Register and authenticate as buyer
 * 2. Create complete delivery address with all required and optional fields
 * 3. Validate response contains all submitted data
 * 4. Validate system-generated fields (id, buyer_id, timestamps, is_default)
 */
export async function test_api_buyer_address_creation_complete(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as buyer
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();
  const buyerFullName = RandomGenerator.name();
  const buyerPhone = RandomGenerator.mobile();

  const buyerData = {
    email: buyerEmail,
    password: buyerPassword,
    full_name: buyerFullName,
    phone_number: buyerPhone,
    href: "https://shoppingmall.example.com/register" satisfies string &
      tags.Format<"uri">,
    referrer: "https://google.com/search" satisfies string & tags.Format<"uri">,
  } satisfies IShoppingMallBuyer.ICreate;

  const authenticatedBuyer = await api.functional.auth.buyer.join(connection, {
    body: buyerData,
  });
  typia.assert(authenticatedBuyer);

  // Validate buyer authentication response
  TestValidator.equals(
    "buyer email matches",
    authenticatedBuyer.email,
    buyerEmail,
  );
  TestValidator.equals(
    "buyer full name matches",
    authenticatedBuyer.full_name,
    buyerFullName,
  );
  TestValidator.equals(
    "buyer phone matches",
    authenticatedBuyer.phone_number,
    buyerPhone,
  );

  // Step 2: Create complete delivery address with all required and optional fields
  const recipientName = RandomGenerator.name();
  const recipientPhone = RandomGenerator.mobile();
  const streetLine1 = `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} Main Street, Apt 5B`;
  const streetLine2 = "Building C, Floor 3";
  const city = "Seoul";
  const state = "Seoul";
  const postalCode = typia
    .random<
      number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
    >()
    .toString();
  const country = "South Korea";
  const addressLabel = "Home";
  const addressType = "residential";
  const deliveryInstructions =
    "Please leave package at front door. Ring doorbell twice.";

  const addressData = {
    recipient_name: recipientName,
    phone: recipientPhone,
    street_address_line1: streetLine1,
    street_address_line2: streetLine2,
    city: city,
    state: state,
    postal_code: postalCode,
    country: country,
    address_label: addressLabel,
    address_type: addressType,
    special_delivery_instructions: deliveryInstructions,
    is_default: true,
  } satisfies IShoppingMallBuyerAddress.ICreate;

  const createdAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: addressData,
      },
    );
  typia.assert(createdAddress);

  // Step 3: Validate response contains all submitted data
  TestValidator.equals(
    "recipient name matches",
    createdAddress.recipient_name,
    recipientName,
  );
  TestValidator.equals("phone matches", createdAddress.phone, recipientPhone);
  TestValidator.equals(
    "street line 1 matches",
    createdAddress.street_address_line1,
    streetLine1,
  );
  TestValidator.equals(
    "street line 2 matches",
    createdAddress.street_address_line2,
    streetLine2,
  );
  TestValidator.equals("city matches", createdAddress.city, city);
  TestValidator.equals("state matches", createdAddress.state, state);
  TestValidator.equals(
    "postal code matches",
    createdAddress.postal_code,
    postalCode,
  );
  TestValidator.equals("country matches", createdAddress.country, country);
  TestValidator.equals(
    "address label matches",
    createdAddress.address_label,
    addressLabel,
  );
  TestValidator.equals(
    "address type matches",
    createdAddress.address_type,
    addressType,
  );
  TestValidator.equals(
    "delivery instructions match",
    createdAddress.special_delivery_instructions,
    deliveryInstructions,
  );

  // Step 4: Validate system-generated fields
  TestValidator.equals(
    "buyer_id matches authenticated buyer",
    createdAddress.shopping_mall_buyer_id,
    authenticatedBuyer.id,
  );
  TestValidator.equals(
    "is_default flag is set",
    createdAddress.is_default,
    true,
  );
}
