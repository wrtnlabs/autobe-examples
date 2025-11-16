import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";

/**
 * Test updating an address to clear previously set optional fields by setting
 * them to null.
 *
 * This test validates that buyers can remove optional information from their
 * saved addresses when such information is no longer needed or applicable. The
 * test creates a complete address with all optional fields populated, then
 * updates it to clear street_address_line2, state, and
 * special_delivery_instructions by setting them to null.
 *
 * Test workflow:
 *
 * 1. Register a new buyer account
 * 2. Create an address with all optional fields populated
 * 3. Update the address setting optional fields to null
 * 4. Validate that optional fields are successfully cleared
 * 5. Validate that required fields remain intact
 */
export async function test_api_buyer_address_update_clearing_optional_fields(
  connection: api.IConnection,
) {
  // Step 1: Register new buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyerEmail,
        password: buyerPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: "https://test.example.com/register",
        referrer: "https://test.example.com/home",
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(buyer);

  // Step 2: Create address with all optional fields populated
  const initialAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address_line1: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} Main Street`,
          street_address_line2: `Apartment ${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<500>>()}`,
          city: RandomGenerator.name(1),
          state: RandomGenerator.name(1),
          postal_code: typia
            .random<
              number &
                tags.Type<"uint32"> &
                tags.Minimum<10000> &
                tags.Maximum<99999>
            >()
            .toString(),
          country: "United States",
          address_label: "Home",
          address_type: "residential",
          special_delivery_instructions:
            "Ring doorbell twice and wait for recipient",
          is_default: true,
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(initialAddress);

  // Verify initial address has optional fields populated
  TestValidator.predicate(
    "initial address should have street_address_line2",
    initialAddress.street_address_line2 !== null &&
      initialAddress.street_address_line2 !== undefined,
  );
  TestValidator.predicate(
    "initial address should have state",
    initialAddress.state !== null && initialAddress.state !== undefined,
  );
  TestValidator.predicate(
    "initial address should have special_delivery_instructions",
    initialAddress.special_delivery_instructions !== null &&
      initialAddress.special_delivery_instructions !== undefined,
  );

  // Step 3: Update address to clear optional fields by setting them to null
  const updatedAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.update(
      connection,
      {
        addressId: initialAddress.id,
        body: {
          street_address_line2: null,
          state: null,
          special_delivery_instructions: null,
        } satisfies IShoppingMallBuyerAddress.IUpdate,
      },
    );
  typia.assert(updatedAddress);

  // Step 4: Validate that optional fields are successfully cleared (null)
  TestValidator.equals(
    "street_address_line2 should be null after clearing",
    updatedAddress.street_address_line2,
    null,
  );
  TestValidator.equals(
    "state should be null after clearing",
    updatedAddress.state,
    null,
  );
  TestValidator.equals(
    "special_delivery_instructions should be null after clearing",
    updatedAddress.special_delivery_instructions,
    null,
  );

  // Step 5: Validate that required fields remain intact
  TestValidator.equals(
    "recipient_name should remain unchanged",
    updatedAddress.recipient_name,
    initialAddress.recipient_name,
  );
  TestValidator.equals(
    "phone should remain unchanged",
    updatedAddress.phone,
    initialAddress.phone,
  );
  TestValidator.equals(
    "street_address_line1 should remain unchanged",
    updatedAddress.street_address_line1,
    initialAddress.street_address_line1,
  );
  TestValidator.equals(
    "city should remain unchanged",
    updatedAddress.city,
    initialAddress.city,
  );
  TestValidator.equals(
    "postal_code should remain unchanged",
    updatedAddress.postal_code,
    initialAddress.postal_code,
  );
  TestValidator.equals(
    "country should remain unchanged",
    updatedAddress.country,
    initialAddress.country,
  );
  TestValidator.equals(
    "address_label should remain unchanged",
    updatedAddress.address_label,
    initialAddress.address_label,
  );
  TestValidator.equals(
    "address_type should remain unchanged",
    updatedAddress.address_type,
    initialAddress.address_type,
  );
  TestValidator.equals(
    "is_default should remain unchanged",
    updatedAddress.is_default,
    initialAddress.is_default,
  );

  // Validate the address ID remains the same (same address entity)
  TestValidator.equals(
    "address ID should remain the same",
    updatedAddress.id,
    initialAddress.id,
  );
}
