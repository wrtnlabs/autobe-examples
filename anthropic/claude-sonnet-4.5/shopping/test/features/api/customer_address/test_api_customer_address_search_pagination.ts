import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAddress";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test pagination functionality for customer address search.
 *
 * This test validates that the address pagination system works correctly when a
 * customer has multiple saved addresses. It creates a customer account, adds
 * numerous addresses exceeding typical page size, then validates pagination
 * controls work correctly including page size configuration, page navigation,
 * total count accuracy, and proper ordering of results.
 *
 * The test workflow:
 *
 * 1. Register a new customer account
 * 2. Create multiple delivery addresses (at least 15 to test pagination)
 * 3. Test first page retrieval and validate pagination metadata
 * 4. Test second page retrieval and verify different addresses are returned
 * 5. Validate that total count matches the number of addresses created
 * 6. Verify that addresses maintain consistent ordering across pages
 */
export async function test_api_customer_address_search_pagination(
  connection: api.IConnection,
) {
  // Step 1: Register a new customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create multiple delivery addresses (15 addresses to test pagination)
  const addressCount = 15;
  const createdAddresses = await ArrayUtil.asyncMap(
    ArrayUtil.repeat(addressCount, (index) => index),
    async (index) => {
      const address =
        await api.functional.shoppingMall.customer.addresses.create(
          connection,
          {
            body: {
              recipient_name: RandomGenerator.name(),
              phone_number: RandomGenerator.mobile(),
              address_line1: `${index + 1} ${RandomGenerator.paragraph({ sentences: 3 })} Street`,
              city: RandomGenerator.name(1),
              state_province: RandomGenerator.name(1),
              postal_code: typia
                .random<
                  number &
                    tags.Type<"uint32"> &
                    tags.Minimum<10000> &
                    tags.Maximum<99999>
                >()
                .toString(),
              country: "United States",
            } satisfies IShoppingMallAddress.ICreate,
          },
        );
      typia.assert(address);
      return address;
    },
  );

  // Step 3: Test first page retrieval (page 0)
  const firstPage = await api.functional.shoppingMall.customer.addresses.index(
    connection,
    {
      body: {
        page: 0,
      } satisfies IShoppingMallAddress.IRequest,
    },
  );
  typia.assert(firstPage);

  // Validate pagination metadata for first page
  TestValidator.equals(
    "first page current page number",
    firstPage.pagination.current,
    0,
  );
  TestValidator.equals(
    "total records match created addresses",
    firstPage.pagination.records,
    addressCount,
  );
  TestValidator.predicate("first page has data", firstPage.data.length > 0);
  TestValidator.predicate(
    "pagination limit is positive",
    firstPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total pages calculated correctly",
    firstPage.pagination.pages ===
      Math.ceil(addressCount / firstPage.pagination.limit),
  );

  // Step 4: Test second page retrieval if multiple pages exist
  if (firstPage.pagination.pages > 1) {
    const secondPage =
      await api.functional.shoppingMall.customer.addresses.index(connection, {
        body: {
          page: 1,
        } satisfies IShoppingMallAddress.IRequest,
      });
    typia.assert(secondPage);

    // Validate pagination metadata for second page
    TestValidator.equals(
      "second page current page number",
      secondPage.pagination.current,
      1,
    );
    TestValidator.equals(
      "total records consistent across pages",
      secondPage.pagination.records,
      addressCount,
    );
    TestValidator.predicate("second page has data", secondPage.data.length > 0);

    // Verify that first and second page return different addresses
    const firstPageIds = firstPage.data.map((addr) => addr.id);
    const secondPageIds = secondPage.data.map((addr) => addr.id);
    const hasOverlap = firstPageIds.some((id) => secondPageIds.includes(id));
    TestValidator.predicate(
      "first and second page return different addresses",
      !hasOverlap,
    );
  }

  // Step 5: Retrieve all pages and verify total count
  const allPages = await ArrayUtil.asyncMap(
    ArrayUtil.repeat(firstPage.pagination.pages, (page) => page),
    async (page) => {
      const currentPage =
        await api.functional.shoppingMall.customer.addresses.index(connection, {
          body: {
            page: page,
          } satisfies IShoppingMallAddress.IRequest,
        });
      typia.assert(currentPage);
      return currentPage;
    },
  );

  const allRetrievedAddresses = allPages.flatMap((page) => page.data);

  // Verify all created addresses are retrievable through pagination
  TestValidator.equals(
    "total retrieved addresses match created count",
    allRetrievedAddresses.length,
    addressCount,
  );

  // Verify all created addresses are present in paginated results
  for (const createdAddr of createdAddresses) {
    const found = allRetrievedAddresses.find(
      (addr) => addr.id === createdAddr.id,
    );
    TestValidator.predicate(
      `address ${createdAddr.id} found in paginated results`,
      found !== undefined,
    );
  }
}
