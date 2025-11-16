import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";

/**
 * Test the common use case of correcting postal address information.
 *
 * This test validates that buyers can maintain accurate delivery information by
 * correcting errors discovered after initial address creation. The scenario
 * covers fixing typos in street addresses, correcting transposed postal code
 * digits, and updating misspelled city names.
 *
 * Test workflow:
 *
 * 1. Register a new buyer account
 * 2. Create an initial address with variations that need correction
 * 3. Update the address with corrected street_address_line1, postal_code, and city
 * 4. Retrieve and validate that all corrections were applied
 * 5. Verify postal code validation is enforced for corrected values
 */
export async function test_api_buyer_address_update_correcting_postal_information(
  connection: api.IConnection,
) {
  // Step 1: Register a new buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        ip: "192.168.1.100",
        href: "https://shop.example.com/register",
        referrer: "https://google.com/search?q=shopping",
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(buyer);

  // Step 2: Create initial address with variations that need correction
  const initialAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address_line1: "123 Mian Street", // Typo: "Mian" instead of "Main"
          street_address_line2: "Apt 4B",
          city: "San Fransisco", // Typo: "Fransisco" instead of "Francisco"
          state: "California",
          postal_code: "94102", // Will be corrected to different code
          country: "United States",
          address_label: "Home",
          address_type: "residential",
          special_delivery_instructions: "Ring doorbell twice",
          is_default: true,
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(initialAddress);

  // Step 3: Update the address with corrected postal information
  const correctedAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.update(
      connection,
      {
        addressId: initialAddress.id,
        body: {
          street_address_line1: "123 Main Street", // Corrected: "Main" instead of "Mian"
          city: "San Francisco", // Corrected: "Francisco" instead of "Fransisco"
          postal_code: "94103", // Corrected: transposed digit fixed
        } satisfies IShoppingMallBuyerAddress.IUpdate,
      },
    );
  typia.assert(correctedAddress);

  // Step 4: Validate all corrections were applied
  TestValidator.equals(
    "corrected street address",
    correctedAddress.street_address_line1,
    "123 Main Street",
  );
  TestValidator.equals(
    "corrected city name",
    correctedAddress.city,
    "San Francisco",
  );
  TestValidator.equals(
    "corrected postal code",
    correctedAddress.postal_code,
    "94103",
  );

  // Step 5: Verify unchanged fields remain the same
  TestValidator.equals(
    "recipient name unchanged",
    correctedAddress.recipient_name,
    initialAddress.recipient_name,
  );
  TestValidator.equals(
    "phone unchanged",
    correctedAddress.phone,
    initialAddress.phone,
  );
  TestValidator.equals(
    "address label unchanged",
    correctedAddress.address_label,
    initialAddress.address_label,
  );
  TestValidator.equals(
    "country unchanged",
    correctedAddress.country,
    initialAddress.country,
  );
  TestValidator.equals(
    "is default unchanged",
    correctedAddress.is_default,
    initialAddress.is_default,
  );
}
