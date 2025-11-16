import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";

/**
 * Test creating a commercial delivery address with address_type='commercial'.
 *
 * This scenario validates that business addresses are correctly classified for
 * commercial delivery handling. It authenticates as a buyer, creates an address
 * with address_type='commercial' indicating a business location, and verifies
 * that the address is created with the commercial type designation.
 *
 * Process:
 *
 * 1. Register and authenticate as a new buyer
 * 2. Create a commercial delivery address with business details
 * 3. Verify address_type is set to 'commercial'
 * 4. Confirm all address data is correctly stored
 */
export async function test_api_buyer_address_commercial_type(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as buyer
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();
  const buyerFullName = RandomGenerator.name(2);
  const buyerPhone = RandomGenerator.mobile();

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyerEmail,
        password: buyerPassword,
        full_name: buyerFullName,
        phone_number: buyerPhone,
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(buyer);

  // Step 2: Create commercial delivery address
  const postalCode = ArrayUtil.repeat(5, () =>
    RandomGenerator.pick([..."0123456789"]),
  ).join("");

  const addressData = {
    recipient_name: RandomGenerator.name(2),
    phone: RandomGenerator.mobile(),
    street_address_line1: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.name(1)} Street`,
    street_address_line2: `${RandomGenerator.name(2)} Corporation, Floor ${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<50>>()}`,
    city: RandomGenerator.name(1),
    state: RandomGenerator.name(1),
    postal_code: postalCode,
    country: "United States",
    address_label: "Office",
    address_type: "commercial",
    special_delivery_instructions:
      "Please deliver during business hours (9 AM - 5 PM). Contact reception desk upon arrival.",
    is_default: true,
  } satisfies IShoppingMallBuyerAddress.ICreate;

  const createdAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: addressData,
      },
    );
  typia.assert(createdAddress);

  // Step 3: Verify address_type is 'commercial'
  TestValidator.equals(
    "address type should be commercial",
    createdAddress.address_type,
    "commercial",
  );

  // Step 4: Verify all address fields
  TestValidator.equals(
    "recipient name matches",
    createdAddress.recipient_name,
    addressData.recipient_name,
  );

  TestValidator.equals(
    "phone matches",
    createdAddress.phone,
    addressData.phone,
  );

  TestValidator.equals(
    "street address line 1 matches",
    createdAddress.street_address_line1,
    addressData.street_address_line1,
  );

  TestValidator.equals(
    "street address line 2 matches",
    createdAddress.street_address_line2,
    addressData.street_address_line2,
  );

  TestValidator.equals("city matches", createdAddress.city, addressData.city);

  TestValidator.equals(
    "state matches",
    createdAddress.state,
    addressData.state,
  );

  TestValidator.equals(
    "postal code matches",
    createdAddress.postal_code,
    addressData.postal_code,
  );

  TestValidator.equals(
    "country matches",
    createdAddress.country,
    addressData.country,
  );

  TestValidator.equals(
    "address label matches",
    createdAddress.address_label,
    addressData.address_label,
  );

  TestValidator.equals(
    "special delivery instructions match",
    createdAddress.special_delivery_instructions,
    addressData.special_delivery_instructions,
  );

  TestValidator.equals(
    "is default flag matches",
    createdAddress.is_default,
    addressData.is_default,
  );
}
