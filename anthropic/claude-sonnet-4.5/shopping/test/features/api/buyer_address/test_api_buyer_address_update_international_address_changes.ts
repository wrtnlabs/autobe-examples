import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";

/**
 * Test updating addresses to reflect international relocations or corrections
 * to international address formats.
 *
 * This test validates that buyers can update addresses when moving between
 * countries or correcting international postal information such as changing
 * from US format to Canadian format, updating UK postcode structure, or
 * modifying addresses for countries without state divisions.
 *
 * Test flow:
 *
 * 1. Create a new buyer account
 * 2. Create an initial address with US format (includes state field)
 * 3. Update the address to Canadian format (different postal code format, state
 *    becomes province)
 * 4. Verify the updated address reflects all changes correctly
 * 5. Update the address to UK format (no state field, different postal code
 *    structure)
 * 6. Verify the state field is null and postal code format is correct
 */
export async function test_api_buyer_address_update_international_address_changes(
  connection: api.IConnection,
) {
  // Step 1: Create a new buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        ip: "192.168.1.100",
        href: "https://example.com/register",
        referrer: "https://google.com",
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(buyer);

  // Step 2: Create initial address with US format
  const initialUsAddress = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile("+1"),
    street_address_line1: "123 Main Street",
    street_address_line2: "Apt 4B",
    city: "New York",
    state: "NY",
    postal_code: "10001",
    country: "United States",
    address_label: "US Home",
    address_type: "residential",
    special_delivery_instructions: "Ring doorbell twice",
    is_default: true,
  } satisfies IShoppingMallBuyerAddress.ICreate;

  const createdAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: initialUsAddress,
      },
    );
  typia.assert(createdAddress);

  TestValidator.equals(
    "initial address country",
    createdAddress.country,
    "United States",
  );
  TestValidator.equals("initial address state", createdAddress.state, "NY");
  TestValidator.equals(
    "initial address postal code",
    createdAddress.postal_code,
    "10001",
  );

  // Step 3: Update to Canadian format
  const canadianUpdate = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile("+1"),
    street_address_line1: "456 Maple Avenue",
    street_address_line2: "Suite 200",
    city: "Toronto",
    state: "ON",
    postal_code: "M5H 2N2",
    country: "Canada",
    address_label: "Canada Office",
    address_type: "commercial",
    special_delivery_instructions: "Use loading dock entrance",
  } satisfies IShoppingMallBuyerAddress.IUpdate;

  const canadianAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.update(
      connection,
      {
        addressId: createdAddress.id,
        body: canadianUpdate,
      },
    );
  typia.assert(canadianAddress);

  TestValidator.equals(
    "canadian address country",
    canadianAddress.country,
    "Canada",
  );
  TestValidator.equals(
    "canadian address province",
    canadianAddress.state,
    "ON",
  );
  TestValidator.equals(
    "canadian postal code format",
    canadianAddress.postal_code,
    "M5H 2N2",
  );
  TestValidator.equals(
    "canadian address city",
    canadianAddress.city,
    "Toronto",
  );
  TestValidator.equals(
    "canadian address type",
    canadianAddress.address_type,
    "commercial",
  );

  // Step 4: Update to UK format (no state field)
  const ukUpdate = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile("+44"),
    street_address_line1: "10 Downing Street",
    street_address_line2: null,
    city: "London",
    state: null,
    postal_code: "SW1A 2AA",
    country: "United Kingdom",
    address_label: "UK Residence",
    address_type: "residential",
    special_delivery_instructions: null,
  } satisfies IShoppingMallBuyerAddress.IUpdate;

  const ukAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.update(
      connection,
      {
        addressId: createdAddress.id,
        body: ukUpdate,
      },
    );
  typia.assert(ukAddress);

  TestValidator.equals(
    "uk address country",
    ukAddress.country,
    "United Kingdom",
  );
  TestValidator.equals("uk address state is null", ukAddress.state, null);
  TestValidator.equals(
    "uk postal code format",
    ukAddress.postal_code,
    "SW1A 2AA",
  );
  TestValidator.equals("uk address city", ukAddress.city, "London");
  TestValidator.equals(
    "uk secondary address line null",
    ukAddress.street_address_line2,
    null,
  );
  TestValidator.equals(
    "uk delivery instructions null",
    ukAddress.special_delivery_instructions,
    null,
  );

  // Step 5: Verify final address ID remains the same
  TestValidator.equals("address id unchanged", ukAddress.id, createdAddress.id);
}
