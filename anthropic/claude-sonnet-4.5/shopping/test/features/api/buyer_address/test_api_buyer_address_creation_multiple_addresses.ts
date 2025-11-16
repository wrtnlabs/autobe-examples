import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";

/**
 * Test multiple delivery address creation for buyers.
 *
 * This test validates the core address book functionality that allows buyers to
 * create and maintain multiple shipping addresses for different destinations
 * such as home, office, and family locations. This is essential for flexible
 * order fulfillment where buyers need to ship products to various locations.
 *
 * Test Flow:
 *
 * 1. Create and authenticate a new buyer account
 * 2. Create first address labeled "Home" with residential type
 * 3. Create second address labeled "Office" with commercial type
 * 4. Create third address labeled "Parents House" with residential type
 * 5. Validate all addresses are successfully stored with unique identifiers
 * 6. Verify each address maintains its distinct properties and labels
 */
export async function test_api_buyer_address_creation_multiple_addresses(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();
  const buyerFullName = RandomGenerator.name(2);
  const buyerPhone = RandomGenerator.mobile();
  const currentUrl = "https://shopping-mall.example.com/register";
  const referrerUrl = "https://google.com";

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyerEmail,
        password: buyerPassword,
        full_name: buyerFullName,
        phone_number: buyerPhone,
        href: currentUrl,
        referrer: referrerUrl,
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(buyer);

  // Validate buyer creation
  TestValidator.equals("buyer email matches", buyer.email, buyerEmail);
  TestValidator.equals(
    "buyer full name matches",
    buyer.full_name,
    buyerFullName,
  );
  TestValidator.predicate(
    "buyer has valid ID",
    buyer.id !== null && buyer.id !== undefined,
  );
  TestValidator.predicate(
    "buyer has authentication token",
    buyer.token.access.length > 0,
  );

  // Step 2: Create first address - Home (residential)
  const homeAddress = {
    recipient_name: buyerFullName,
    phone: buyerPhone,
    street_address_line1: "123 Main Street",
    street_address_line2: "Apartment 4B",
    city: "New York",
    state: "NY",
    postal_code: "10001",
    country: "United States",
    address_label: "Home",
    address_type: "residential",
    special_delivery_instructions: "Leave package at front desk",
    is_default: true,
  } satisfies IShoppingMallBuyerAddress.ICreate;

  const createdHomeAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: homeAddress,
      },
    );
  typia.assert(createdHomeAddress);

  // Validate home address
  TestValidator.predicate(
    "home address has unique ID",
    createdHomeAddress.id.length > 0,
  );
  TestValidator.equals(
    "home address label",
    createdHomeAddress.address_label,
    "Home",
  );
  TestValidator.equals(
    "home address type",
    createdHomeAddress.address_type,
    "residential",
  );
  TestValidator.equals(
    "home recipient name",
    createdHomeAddress.recipient_name,
    buyerFullName,
  );
  TestValidator.equals(
    "home street address",
    createdHomeAddress.street_address_line1,
    "123 Main Street",
  );
  TestValidator.equals("home city", createdHomeAddress.city, "New York");
  TestValidator.equals("home state", createdHomeAddress.state, "NY");
  TestValidator.equals(
    "home postal code",
    createdHomeAddress.postal_code,
    "10001",
  );
  TestValidator.equals(
    "home country",
    createdHomeAddress.country,
    "United States",
  );
  TestValidator.equals("home is default", createdHomeAddress.is_default, true);
  TestValidator.predicate(
    "home created_at exists",
    createdHomeAddress.created_at !== null,
  );
  TestValidator.predicate(
    "home updated_at exists",
    createdHomeAddress.updated_at !== null,
  );

  // Step 3: Create second address - Office (commercial)
  const officeAddress = {
    recipient_name: buyerFullName,
    phone: buyerPhone,
    street_address_line1: "456 Business Avenue",
    street_address_line2: "Suite 200",
    city: "Los Angeles",
    state: "CA",
    postal_code: "90001",
    country: "United States",
    address_label: "Office",
    address_type: "commercial",
    special_delivery_instructions: "Call receptionist upon arrival",
    is_default: false,
  } satisfies IShoppingMallBuyerAddress.ICreate;

  const createdOfficeAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: officeAddress,
      },
    );
  typia.assert(createdOfficeAddress);

  // Validate office address
  TestValidator.predicate(
    "office address has unique ID",
    createdOfficeAddress.id.length > 0,
  );
  TestValidator.equals(
    "office address label",
    createdOfficeAddress.address_label,
    "Office",
  );
  TestValidator.equals(
    "office address type",
    createdOfficeAddress.address_type,
    "commercial",
  );
  TestValidator.equals(
    "office recipient name",
    createdOfficeAddress.recipient_name,
    buyerFullName,
  );
  TestValidator.equals(
    "office street address",
    createdOfficeAddress.street_address_line1,
    "456 Business Avenue",
  );
  TestValidator.equals("office city", createdOfficeAddress.city, "Los Angeles");
  TestValidator.equals("office state", createdOfficeAddress.state, "CA");
  TestValidator.equals(
    "office postal code",
    createdOfficeAddress.postal_code,
    "90001",
  );
  TestValidator.equals(
    "office country",
    createdOfficeAddress.country,
    "United States",
  );
  TestValidator.equals(
    "office is default",
    createdOfficeAddress.is_default,
    false,
  );
  TestValidator.predicate(
    "office created_at exists",
    createdOfficeAddress.created_at !== null,
  );

  // Step 4: Create third address - Parents House (residential)
  const parentsAddress = {
    recipient_name: RandomGenerator.name(2),
    phone: RandomGenerator.mobile(),
    street_address_line1: "789 Family Lane",
    city: "Chicago",
    state: "IL",
    postal_code: "60601",
    country: "United States",
    address_label: "Parents House",
    address_type: "residential",
    is_default: false,
  } satisfies IShoppingMallBuyerAddress.ICreate;

  const createdParentsAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: parentsAddress,
      },
    );
  typia.assert(createdParentsAddress);

  // Validate parents address
  TestValidator.predicate(
    "parents address has unique ID",
    createdParentsAddress.id.length > 0,
  );
  TestValidator.equals(
    "parents address label",
    createdParentsAddress.address_label,
    "Parents House",
  );
  TestValidator.equals(
    "parents address type",
    createdParentsAddress.address_type,
    "residential",
  );
  TestValidator.equals(
    "parents street address",
    createdParentsAddress.street_address_line1,
    "789 Family Lane",
  );
  TestValidator.equals("parents city", createdParentsAddress.city, "Chicago");
  TestValidator.equals("parents state", createdParentsAddress.state, "IL");
  TestValidator.equals(
    "parents postal code",
    createdParentsAddress.postal_code,
    "60601",
  );
  TestValidator.equals(
    "parents country",
    createdParentsAddress.country,
    "United States",
  );
  TestValidator.equals(
    "parents is default",
    createdParentsAddress.is_default,
    false,
  );

  // Step 5: Verify all addresses have unique IDs
  TestValidator.notEquals(
    "home and office IDs differ",
    createdHomeAddress.id,
    createdOfficeAddress.id,
  );
  TestValidator.notEquals(
    "home and parents IDs differ",
    createdHomeAddress.id,
    createdParentsAddress.id,
  );
  TestValidator.notEquals(
    "office and parents IDs differ",
    createdOfficeAddress.id,
    createdParentsAddress.id,
  );

  // Step 6: Verify address labels are distinct
  TestValidator.notEquals(
    "home and office labels differ",
    createdHomeAddress.address_label,
    createdOfficeAddress.address_label,
  );
  TestValidator.notEquals(
    "home and parents labels differ",
    createdHomeAddress.address_label,
    createdParentsAddress.address_label,
  );
  TestValidator.notEquals(
    "office and parents labels differ",
    createdOfficeAddress.address_label,
    createdParentsAddress.address_label,
  );
}
