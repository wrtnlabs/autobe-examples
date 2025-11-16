import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";

/**
 * Test creating delivery addresses for various international locations with
 * different postal code formats.
 *
 * This test validates the system's ability to handle international address
 * variations including:
 *
 * - US ZIP codes (5-digit and ZIP+4 formats)
 * - Canadian postal codes (A1A 1A1 format)
 * - UK postcodes (SW1A 1AA format)
 * - Countries without state/province divisions (state field as null)
 *
 * The test ensures that country-specific validation is applied appropriately
 * and that the postal_code field accommodates different international formats
 * up to 20 characters.
 */
export async function test_api_buyer_address_creation_international_formats(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyerEmail,
        password: buyerPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(buyer);

  // Step 2: Create US address with 5-digit ZIP code
  const usAddress5Digit = {
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
    is_default: true,
  } satisfies IShoppingMallBuyerAddress.ICreate;

  const createdUsAddress5: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: usAddress5Digit,
      },
    );
  typia.assert(createdUsAddress5);

  TestValidator.equals(
    "US 5-digit ZIP recipient name",
    createdUsAddress5.recipient_name,
    usAddress5Digit.recipient_name,
  );
  TestValidator.equals(
    "US 5-digit ZIP postal code",
    createdUsAddress5.postal_code,
    "10001",
  );
  TestValidator.equals("US 5-digit ZIP state", createdUsAddress5.state, "NY");
  TestValidator.equals(
    "US 5-digit ZIP country",
    createdUsAddress5.country,
    "United States",
  );

  // Step 3: Create US address with ZIP+4 format
  const usAddressZipPlus4 = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile("+1"),
    street_address_line1: "456 Oak Avenue",
    city: "Los Angeles",
    state: "CA",
    postal_code: "90001-1234",
    country: "United States",
    address_label: "US Office",
    address_type: "commercial",
    is_default: false,
  } satisfies IShoppingMallBuyerAddress.ICreate;

  const createdUsAddressZip4: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: usAddressZipPlus4,
      },
    );
  typia.assert(createdUsAddressZip4);

  TestValidator.equals(
    "US ZIP+4 postal code",
    createdUsAddressZip4.postal_code,
    "90001-1234",
  );
  TestValidator.equals("US ZIP+4 state", createdUsAddressZip4.state, "CA");

  // Step 4: Create Canadian address with A1A 1A1 format
  const canadaAddress = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile("+1"),
    street_address_line1: "789 Maple Drive",
    city: "Toronto",
    state: "ON",
    postal_code: "M5H 2N2",
    country: "Canada",
    address_label: "Canada Home",
    address_type: "residential",
    is_default: false,
  } satisfies IShoppingMallBuyerAddress.ICreate;

  const createdCanadaAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: canadaAddress,
      },
    );
  typia.assert(createdCanadaAddress);

  TestValidator.equals(
    "Canadian postal code",
    createdCanadaAddress.postal_code,
    "M5H 2N2",
  );
  TestValidator.equals("Canadian province", createdCanadaAddress.state, "ON");
  TestValidator.equals(
    "Canadian country",
    createdCanadaAddress.country,
    "Canada",
  );

  // Step 5: Create UK address with postcode format
  const ukAddress = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile("+44"),
    street_address_line1: "10 Downing Street",
    city: "London",
    state: "England",
    postal_code: "SW1A 1AA",
    country: "United Kingdom",
    address_label: "UK Office",
    address_type: "commercial",
    is_default: false,
  } satisfies IShoppingMallBuyerAddress.ICreate;

  const createdUkAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: ukAddress,
      },
    );
  typia.assert(createdUkAddress);

  TestValidator.equals("UK postcode", createdUkAddress.postal_code, "SW1A 1AA");
  TestValidator.equals("UK region", createdUkAddress.state, "England");
  TestValidator.equals(
    "UK country",
    createdUkAddress.country,
    "United Kingdom",
  );

  // Step 6: Create address for country without state (Singapore)
  const singaporeAddress = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile("+65"),
    street_address_line1: "1 Marina Boulevard",
    street_address_line2: "Level 20",
    city: "Singapore",
    state: null,
    postal_code: "018989",
    country: "Singapore",
    address_label: "Singapore Office",
    address_type: "commercial",
    is_default: false,
  } satisfies IShoppingMallBuyerAddress.ICreate;

  const createdSingaporeAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: singaporeAddress,
      },
    );
  typia.assert(createdSingaporeAddress);

  TestValidator.equals(
    "Singapore postal code",
    createdSingaporeAddress.postal_code,
    "018989",
  );
  TestValidator.equals(
    "Singapore state should be null",
    createdSingaporeAddress.state,
    null,
  );
  TestValidator.equals(
    "Singapore country",
    createdSingaporeAddress.country,
    "Singapore",
  );

  // Step 7: Validate address type and label preservation
  TestValidator.equals(
    "Address type preserved",
    createdUsAddress5.address_type,
    "residential",
  );
  TestValidator.equals(
    "Address label preserved",
    createdUsAddress5.address_label,
    "US Home",
  );
  TestValidator.equals(
    "Default flag preserved",
    createdUsAddress5.is_default,
    true,
  );
}
