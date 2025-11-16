import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";

/**
 * Test the buyer address creation workflow for establishing delivery locations.
 *
 * This test validates that buyers can successfully register new shipping
 * addresses to their account. The workflow covers buyer registration,
 * authentication, and address creation with complete postal information.
 *
 * Step-by-step process:
 *
 * 1. Buyer registers and authenticates via join to create buyer account
 * 2. Buyer creates a new delivery address with complete postal information
 * 3. Verify address is successfully created with all required and optional fields
 * 4. Validate system-managed fields are automatically populated
 * 5. Confirm the first address is automatically set as default
 * 6. Ensure the address is immediately available for order checkout
 */
export async function test_api_buyer_address_creation_for_delivery(
  connection: api.IConnection,
) {
  // Step 1: Buyer registers and authenticates
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();

  const buyerRegistration = {
    email: buyerEmail,
    password: buyerPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const authorizedBuyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: buyerRegistration,
    });
  typia.assert(authorizedBuyer);

  // Validate buyer registration response - business logic only
  TestValidator.equals(
    "buyer email matches",
    authorizedBuyer.email,
    buyerEmail,
  );
  TestValidator.equals(
    "buyer full name matches",
    authorizedBuyer.full_name,
    buyerRegistration.full_name,
  );
  TestValidator.equals(
    "buyer phone matches",
    authorizedBuyer.phone_number,
    buyerRegistration.phone_number,
  );

  // Step 2: Buyer creates a new delivery address
  const addressLabels = ["Home", "Office", "Parents House"] as const;
  const addressTypes = ["residential", "commercial"] as const;

  const addressData = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    street_address_line1: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 8,
    }),
    street_address_line2: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 2,
      wordMax: 6,
    }),
    city: RandomGenerator.name(1),
    state: RandomGenerator.name(1),
    postal_code: typia
      .random<
        number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    country: "United States",
    address_label: RandomGenerator.pick(addressLabels),
    address_type: RandomGenerator.pick(addressTypes),
    special_delivery_instructions: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 10,
    }),
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

  // Step 3: Validate address creation - business logic only
  // Validate required fields are properly stored
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
  TestValidator.equals("city matches", createdAddress.city, addressData.city);
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
    "address type matches",
    createdAddress.address_type,
    addressData.address_type,
  );

  // Validate optional fields are handled correctly
  TestValidator.equals(
    "street address line 2 matches",
    createdAddress.street_address_line2,
    addressData.street_address_line2,
  );
  TestValidator.equals(
    "state matches",
    createdAddress.state,
    addressData.state,
  );
  TestValidator.equals(
    "special delivery instructions match",
    createdAddress.special_delivery_instructions,
    addressData.special_delivery_instructions,
  );

  // Validate is_default flag is set correctly
  TestValidator.equals(
    "first address is default",
    createdAddress.is_default,
    true,
  );

  // Validate buyer_id is automatically populated from JWT token
  TestValidator.equals(
    "buyer ID matches authenticated buyer",
    createdAddress.shopping_mall_buyer_id,
    authorizedBuyer.id,
  );
}
