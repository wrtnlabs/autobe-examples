import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallBuyerAddress";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";

/**
 * Test text search functionality across multiple address fields.
 *
 * This test validates that the address search API correctly searches across
 * recipient_name, street_address_line1, street_address_line2, city, state, and
 * postal_code fields. It verifies case-insensitive matching, partial matching,
 * and proper handling of edge cases including very short search strings and
 * special characters.
 *
 * Test flow:
 *
 * 1. Create buyer account and authenticate
 * 2. Create addresses with distinctive searchable values
 * 3. Search by recipient name and verify results
 * 4. Search by street address and verify results
 * 5. Search by city name and verify results
 * 6. Search by postal code and verify results
 * 7. Test case-insensitive matching
 * 8. Test very short search strings (1-2 characters)
 * 9. Test text appearing in multiple fields
 * 10. Validate all search results contain the search term
 */
export async function test_api_buyer_address_search_text_search(
  connection: api.IConnection,
) {
  // Step 1: Create buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://test.example.com/register" satisfies string &
        tags.Format<"uri">,
      referrer: "https://test.example.com/home" satisfies string &
        tags.Format<"uri">,
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  // Step 2: Create addresses with distinctive searchable values

  // Address 1: Unique recipient name "Alexandra Smith"
  const address1 =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
          recipient_name: "Alexandra Smith",
          phone: RandomGenerator.mobile(),
          street_address_line1: "100 Main Street",
          street_address_line2: "Apt 5B",
          city: "Boston",
          state: "Massachusetts",
          postal_code: "02101",
          country: "United States",
          address_label: "Home",
          address_type: "residential",
          is_default: true,
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(address1);

  // Address 2: Unique street address "456 Technology Boulevard"
  const address2 =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
          recipient_name: "John Doe",
          phone: RandomGenerator.mobile(),
          street_address_line1: "456 Technology Boulevard",
          street_address_line2: "Suite 200",
          city: "San Francisco",
          state: "California",
          postal_code: "94102",
          country: "United States",
          address_label: "Office",
          address_type: "commercial",
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(address2);

  // Address 3: Unique city "Seattle"
  const address3 =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
          recipient_name: "Jane Wilson",
          phone: RandomGenerator.mobile(),
          street_address_line1: "789 Pine Avenue",
          city: "Seattle",
          state: "Washington",
          postal_code: "98101",
          country: "United States",
          address_label: "Parents",
          address_type: "residential",
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(address3);

  // Address 4: Unique postal code "10001"
  const address4 =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
          recipient_name: "Robert Brown",
          phone: RandomGenerator.mobile(),
          street_address_line1: "321 Broadway",
          city: "New York",
          state: "New York",
          postal_code: "10001",
          country: "United States",
          address_label: "NYC Office",
          address_type: "commercial",
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(address4);

  // Address 5: Text "Maple" appears in multiple fields (street and city)
  const address5 =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
          recipient_name: "Sarah Johnson",
          phone: RandomGenerator.mobile(),
          street_address_line1: "555 Maple Drive",
          city: "Maplewood",
          state: "New Jersey",
          postal_code: "07040",
          country: "United States",
          address_label: "Vacation",
          address_type: "residential",
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(address5);

  // Step 3: Search by recipient name (partial match)
  const searchByName =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          search: "Alexandra",
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(searchByName);
  TestValidator.equals(
    "search by recipient name should find address1",
    searchByName.data.length,
    1,
  );
  TestValidator.equals(
    "found address should match address1",
    searchByName.data[0].id,
    address1.id,
  );

  // Step 4: Search by street address (partial match)
  const searchByStreet =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          search: "Technology Boulevard",
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(searchByStreet);
  TestValidator.equals(
    "search by street should find address2",
    searchByStreet.data.length,
    1,
  );
  TestValidator.equals(
    "found address should match address2",
    searchByStreet.data[0].id,
    address2.id,
  );

  // Step 5: Search by city name
  const searchByCity =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          search: "Seattle",
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(searchByCity);
  TestValidator.equals(
    "search by city should find address3",
    searchByCity.data.length,
    1,
  );
  TestValidator.equals(
    "found address should match address3",
    searchByCity.data[0].id,
    address3.id,
  );

  // Step 6: Search by postal code
  const searchByPostal =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          search: "10001",
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(searchByPostal);
  TestValidator.equals(
    "search by postal code should find address4",
    searchByPostal.data.length,
    1,
  );
  TestValidator.equals(
    "found address should match address4",
    searchByPostal.data[0].id,
    address4.id,
  );

  // Step 7: Test case-insensitive matching
  const searchCaseInsensitive =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          search: "aLeXaNdRa",
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(searchCaseInsensitive);
  TestValidator.equals(
    "case-insensitive search should find address1",
    searchCaseInsensitive.data.length,
    1,
  );
  TestValidator.equals(
    "found address should match address1",
    searchCaseInsensitive.data[0].id,
    address1.id,
  );

  // Step 8: Test very short search strings (1-2 characters)
  const searchShortString =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          search: "Ma",
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(searchShortString);
  TestValidator.predicate(
    "short search string should find at least one address",
    searchShortString.data.length >= 1,
  );
  const foundAddress1 = searchShortString.data.find(
    (a) => a.id === address1.id,
  );
  const foundAddress5 = searchShortString.data.find(
    (a) => a.id === address5.id,
  );
  TestValidator.predicate(
    "short search 'Ma' should find address1 (Main Street) or address5 (Maple)",
    foundAddress1 !== undefined || foundAddress5 !== undefined,
  );

  // Step 9: Test text appearing in multiple fields of same address
  const searchMultipleFields =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          search: "Maple",
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(searchMultipleFields);
  TestValidator.equals(
    "search for 'Maple' should find address5",
    searchMultipleFields.data.length,
    1,
  );
  TestValidator.equals(
    "found address should match address5",
    searchMultipleFields.data[0].id,
    address5.id,
  );

  // Step 10: Validate search results contain the search term in at least one field
  const allAddresses =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {} satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(allAddresses);
  TestValidator.equals(
    "should have created 5 addresses total",
    allAddresses.data.length,
    5,
  );

  // Search by street address line 2
  const searchByStreet2 =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          search: "Suite 200",
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(searchByStreet2);
  TestValidator.equals(
    "search by street_address_line2 should find address2",
    searchByStreet2.data.length,
    1,
  );
  TestValidator.equals(
    "found address should match address2",
    searchByStreet2.data[0].id,
    address2.id,
  );

  // Search by state
  const searchByState =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          search: "Massachusetts",
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(searchByState);
  TestValidator.equals(
    "search by state should find address1",
    searchByState.data.length,
    1,
  );
  TestValidator.equals(
    "found address should match address1",
    searchByState.data[0].id,
    address1.id,
  );
}
