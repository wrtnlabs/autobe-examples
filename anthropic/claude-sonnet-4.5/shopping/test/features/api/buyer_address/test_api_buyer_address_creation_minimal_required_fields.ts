import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";

/**
 * Test creating a delivery address with only minimum required fields.
 *
 * This test validates that the system correctly handles address creation when
 * buyers provide only mandatory information, ensuring optional fields are
 * properly stored as null values and the address is successfully created and
 * retrievable.
 *
 * Steps:
 *
 * 1. Create a new buyer account and authenticate
 * 2. Create an address with only required fields (no optional fields)
 * 3. Verify the address was created successfully
 * 4. Validate that optional fields are null or undefined
 * 5. Confirm the first address is set as default
 */
export async function test_api_buyer_address_creation_minimal_required_fields(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyerEmail,
        password: buyerPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(buyer);

  // Step 2: Create address with only required fields (omitting all optional fields)
  const addressData = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    street_address_line1: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.name(1)} Street`,
    city: RandomGenerator.name(1),
    postal_code: typia
      .random<
        number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    country: "Singapore",
    address_label: "Home",
    address_type: "residential",
  } satisfies IShoppingMallBuyerAddress.ICreate;

  const createdAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: addressData,
      },
    );
  typia.assert(createdAddress);

  // Step 3: Verify the address was created successfully with required fields matching
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

  // Step 4: Validate that optional fields are null or undefined
  TestValidator.predicate(
    "street_address_line2 is null or undefined",
    createdAddress.street_address_line2 === null ||
      createdAddress.street_address_line2 === undefined,
  );
  TestValidator.predicate(
    "state is null or undefined",
    createdAddress.state === null || createdAddress.state === undefined,
  );
  TestValidator.predicate(
    "special_delivery_instructions is null or undefined",
    createdAddress.special_delivery_instructions === null ||
      createdAddress.special_delivery_instructions === undefined,
  );

  // Step 5: Confirm the first address is automatically set as default
  TestValidator.equals(
    "first address is default",
    createdAddress.is_default,
    true,
  );
}
