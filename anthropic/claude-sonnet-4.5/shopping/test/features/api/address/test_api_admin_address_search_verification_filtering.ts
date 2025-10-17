import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAddress";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test admin address search with verification status filtering.
 *
 * This test validates that administrators can search addresses across the
 * platform for address management and compliance monitoring. Note that the
 * current API (IShoppingMallAddress.IRequest) only supports page-based
 * pagination without explicit verification status filtering parameters, so this
 * test focuses on validating basic admin address search functionality and data
 * integrity.
 *
 * Test Workflow:
 *
 * 1. Create admin account with platform-wide address management permissions
 * 2. Create seller account to own test addresses
 * 3. Generate multiple addresses for the seller
 * 4. Execute admin address search and validate results
 * 5. Verify pagination structure and address data integrity
 */
export async function test_api_admin_address_search_verification_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for platform-wide address management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create seller account to own addresses
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerData = {
    email: sellerEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(2),
    business_type: RandomGenerator.pick([
      "individual",
      "LLC",
      "corporation",
      "partnership",
    ] as const),
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.name(1)} Street`,
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerData,
    });
  typia.assert(seller);

  // Step 3: Create multiple addresses for testing
  const addressCount = 5;
  const createdAddresses: IShoppingMallAddress[] = await ArrayUtil.asyncRepeat(
    addressCount,
    async () => {
      const addressData = {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        address_line1: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.name(1)} ${RandomGenerator.pick(["Street", "Avenue", "Boulevard", "Road", "Lane"] as const)}`,
        city: RandomGenerator.pick([
          "New York",
          "Los Angeles",
          "Chicago",
          "Houston",
          "Phoenix",
        ] as const),
        state_province: RandomGenerator.pick([
          "NY",
          "CA",
          "IL",
          "TX",
          "AZ",
        ] as const),
        postal_code: typia
          .random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<10000> &
              tags.Maximum<99999>
          >()
          .toString(),
        country: "United States",
      } satisfies IShoppingMallAddress.ICreate;

      const address: IShoppingMallAddress =
        await api.functional.shoppingMall.seller.addresses.create(connection, {
          body: addressData,
        });
      typia.assert(address);
      return address;
    },
  );

  // Verify all addresses were created successfully
  TestValidator.equals(
    "created address count matches expected",
    createdAddresses.length,
    addressCount,
  );

  // Step 4: Admin search addresses (admin context already established from step 1)
  const searchRequest = {
    page: 0,
  } satisfies IShoppingMallAddress.IRequest;

  const searchResult: IPageIShoppingMallAddress =
    await api.functional.shoppingMall.admin.addresses.index(connection, {
      body: searchRequest,
    });
  typia.assert(searchResult);

  // Step 5: Validate pagination structure
  TestValidator.predicate(
    "pagination current page is non-negative",
    searchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    searchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages is non-negative",
    searchResult.pagination.pages >= 0,
  );

  // Step 6: Validate address data array structure
  TestValidator.predicate(
    "search result contains data array",
    Array.isArray(searchResult.data),
  );

  // Verify search results contain addresses (platform should have at least the created ones)
  TestValidator.predicate(
    "search results contain addresses",
    searchResult.pagination.records >= addressCount,
  );

  // Validate that some of our created addresses can be found in results
  const foundAddresses = searchResult.data.filter((resultAddr) =>
    createdAddresses.some((createdAddr) => createdAddr.id === resultAddr.id),
  );

  TestValidator.predicate(
    "at least one created address found in search results",
    foundAddresses.length > 0,
  );
}
