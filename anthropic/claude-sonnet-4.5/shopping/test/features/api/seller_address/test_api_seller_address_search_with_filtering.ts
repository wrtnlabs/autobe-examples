import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAddress";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller address search with filtering and pagination.
 *
 * Validates the complete seller address search workflow where an authenticated
 * seller searches and filters their saved delivery addresses. The test ensures
 * that sellers can efficiently find specific addresses using pagination
 * controls, and that the search returns only addresses owned by the
 * authenticated seller with proper pagination metadata.
 *
 * Test Workflow:
 *
 * 1. Register and authenticate as a seller
 * 2. Create multiple test addresses with varied attributes
 * 3. Search addresses with pagination
 * 4. Validate response structure and data correctness
 * 5. Verify pagination metadata accuracy
 * 6. Confirm address ownership isolation
 */
export async function test_api_seller_address_search_with_filtering(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(10),
      business_name: RandomGenerator.name(2),
      business_type: RandomGenerator.pick([
        "individual",
        "LLC",
        "corporation",
        "partnership",
      ] as const),
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: `${typia.random<number & tags.Type<"uint32"> & tags.Maximum<9999>>()} ${RandomGenerator.name(1)} Street`,
      tax_id: RandomGenerator.alphaNumeric(9),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Create multiple test addresses with varied attributes
  const countries = ["USA", "Canada", "UK"] as const;
  const cities = [
    "New York",
    "Toronto",
    "London",
    "Seattle",
    "Vancouver",
  ] as const;
  const states = ["NY", "ON", "ENG", "WA", "BC"] as const;

  const createdAddresses: IShoppingMallAddress[] = await ArrayUtil.asyncRepeat(
    5,
    async (index) => {
      const address = await api.functional.shoppingMall.seller.addresses.create(
        connection,
        {
          body: {
            recipient_name: RandomGenerator.name(),
            phone_number: RandomGenerator.mobile(),
            address_line1: `${typia.random<number & tags.Type<"uint32"> & tags.Maximum<9999>>()} ${RandomGenerator.name(1)} Street`,
            city: RandomGenerator.pick(cities),
            state_province: RandomGenerator.pick(states),
            postal_code: typia
              .random<
                number &
                  tags.Type<"uint32"> &
                  tags.Minimum<10000> &
                  tags.Maximum<99999>
              >()
              .toString(),
            country: RandomGenerator.pick(countries),
          } satisfies IShoppingMallAddress.ICreate,
        },
      );
      typia.assert(address);
      return address;
    },
  );

  // Step 3: Search addresses with pagination (page 1)
  const firstPageResult =
    await api.functional.shoppingMall.seller.addresses.index(connection, {
      body: {
        page: 1,
      } satisfies IShoppingMallAddress.IRequest,
    });
  typia.assert(firstPageResult);

  // Step 4: Validate response structure and data correctness
  TestValidator.predicate(
    "should return all created addresses",
    firstPageResult.data.length === createdAddresses.length,
  );

  // Step 5: Verify pagination metadata accuracy
  TestValidator.equals(
    "current page should be 1",
    firstPageResult.pagination.current,
    1,
  );

  TestValidator.predicate(
    "total records should match created addresses",
    firstPageResult.pagination.records >= createdAddresses.length,
  );

  TestValidator.predicate(
    "pagination limit should be positive",
    firstPageResult.pagination.limit > 0,
  );

  TestValidator.predicate(
    "total pages should be calculated correctly",
    firstPageResult.pagination.pages >= 1,
  );

  // Step 6: Confirm address ownership - all returned addresses should match created ones
  for (const returnedAddress of firstPageResult.data) {
    const matchingAddress = createdAddresses.find(
      (addr) => addr.id === returnedAddress.id,
    );
    TestValidator.predicate(
      "returned address should belong to authenticated seller",
      matchingAddress !== undefined,
    );
  }

  // Step 7: Validate address data completeness
  for (const address of firstPageResult.data) {
    TestValidator.predicate(
      "address should have required id field",
      address.id !== null && address.id !== undefined && address.id.length > 0,
    );

    TestValidator.predicate(
      "address should have recipient name",
      address.recipient_name !== null &&
        address.recipient_name !== undefined &&
        address.recipient_name.length > 0,
    );

    TestValidator.predicate(
      "address should have phone number",
      address.phone_number !== null &&
        address.phone_number !== undefined &&
        address.phone_number.length > 0,
    );

    TestValidator.predicate(
      "address should have address line",
      address.address_line1 !== null &&
        address.address_line1 !== undefined &&
        address.address_line1.length > 0,
    );
  }
}
