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
 * Tests pagination functionality for buyer address search with multiple
 * addresses.
 *
 * This test validates the complete pagination behavior of the buyer address
 * search endpoint by creating a buyer account with more than 10 addresses and
 * testing various pagination scenarios including different page and limit
 * combinations, boundary conditions, and metadata verification.
 *
 * Test workflow:
 *
 * 1. Create a buyer account through authentication
 * 2. Add 15 addresses to test multi-page pagination
 * 3. Test page 1 with limit 5 (first chunk)
 * 4. Test page 2 with limit 5 (second chunk)
 * 5. Test page 1 with limit 20 (all addresses in one page)
 * 6. Test boundary: page beyond total pages
 * 7. Test minimum limit (1)
 * 8. Test maximum limit (100)
 * 9. Test default values (no page/limit specified)
 * 10. Verify no duplicates or missing records across pages
 */
export async function test_api_buyer_address_search_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create buyer account
  const buyerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer = await api.functional.auth.buyer.join(connection, {
    body: buyerData,
  });
  typia.assert(buyer);

  // Step 2: Create 15 addresses to test pagination across multiple pages
  const createdAddresses: IShoppingMallBuyerAddress[] =
    await ArrayUtil.asyncRepeat(15, async (index) => {
      const addressData = {
        recipient_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        street_address_line1: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 7,
        }),
        street_address_line2:
          index % 3 === 0 ? RandomGenerator.paragraph({ sentences: 2 }) : null,
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
        country: RandomGenerator.pick([
          "United States",
          "Canada",
          "United Kingdom",
        ] as const),
        address_label: `Address ${index + 1}`,
        address_type: RandomGenerator.pick([
          "residential",
          "commercial",
        ] as const),
        special_delivery_instructions:
          index % 2 === 0 ? RandomGenerator.paragraph({ sentences: 2 }) : null,
        is_default: index === 0,
      } satisfies IShoppingMallBuyerAddress.ICreate;

      const address =
        await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
          connection,
          { body: addressData },
        );
      typia.assert(address);
      return address;
    });

  // Step 3: Test page 1 with limit 5
  const page1Limit5 =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(page1Limit5);

  TestValidator.equals(
    "page 1 limit 5: current page",
    page1Limit5.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 5: limit",
    page1Limit5.pagination.limit,
    5,
  );
  TestValidator.equals(
    "page 1 limit 5: total records",
    page1Limit5.pagination.records,
    15,
  );
  TestValidator.equals(
    "page 1 limit 5: total pages",
    page1Limit5.pagination.pages,
    3,
  );
  TestValidator.equals(
    "page 1 limit 5: data length",
    page1Limit5.data.length,
    5,
  );

  // Step 4: Test page 2 with limit 5
  const page2Limit5 =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(page2Limit5);

  TestValidator.equals(
    "page 2 limit 5: current page",
    page2Limit5.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit 5: limit",
    page2Limit5.pagination.limit,
    5,
  );
  TestValidator.equals(
    "page 2 limit 5: total records",
    page2Limit5.pagination.records,
    15,
  );
  TestValidator.equals(
    "page 2 limit 5: total pages",
    page2Limit5.pagination.pages,
    3,
  );
  TestValidator.equals(
    "page 2 limit 5: data length",
    page2Limit5.data.length,
    5,
  );

  // Step 5: Verify no duplicates between page 1 and page 2
  const page1Ids = page1Limit5.data.map((addr) => addr.id);
  const page2Ids = page2Limit5.data.map((addr) => addr.id);
  const hasNoDuplicates = page1Ids.every((id) => !page2Ids.includes(id));
  TestValidator.predicate(
    "no duplicates between page 1 and page 2",
    hasNoDuplicates,
  );

  // Step 6: Test page 1 with limit 20 (all addresses in one page)
  const page1Limit20 =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(page1Limit20);

  TestValidator.equals(
    "page 1 limit 20: current page",
    page1Limit20.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 20: limit",
    page1Limit20.pagination.limit,
    20,
  );
  TestValidator.equals(
    "page 1 limit 20: total records",
    page1Limit20.pagination.records,
    15,
  );
  TestValidator.equals(
    "page 1 limit 20: total pages",
    page1Limit20.pagination.pages,
    1,
  );
  TestValidator.equals(
    "page 1 limit 20: data length",
    page1Limit20.data.length,
    15,
  );

  // Step 7: Test page beyond total pages
  const pageBeyond =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          page: 10,
          limit: 5,
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(pageBeyond);
  TestValidator.equals(
    "page beyond total: data should be empty",
    pageBeyond.data.length,
    0,
  );

  // Step 8: Test minimum limit (1)
  const minLimit =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(minLimit);

  TestValidator.equals(
    "min limit: current page",
    minLimit.pagination.current,
    1,
  );
  TestValidator.equals("min limit: limit", minLimit.pagination.limit, 1);
  TestValidator.equals(
    "min limit: total records",
    minLimit.pagination.records,
    15,
  );
  TestValidator.equals("min limit: total pages", minLimit.pagination.pages, 15);
  TestValidator.equals("min limit: data length", minLimit.data.length, 1);

  // Step 9: Test maximum limit (100)
  const maxLimit =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(maxLimit);

  TestValidator.equals(
    "max limit: current page",
    maxLimit.pagination.current,
    1,
  );
  TestValidator.equals("max limit: limit", maxLimit.pagination.limit, 100);
  TestValidator.equals(
    "max limit: total records",
    maxLimit.pagination.records,
    15,
  );
  TestValidator.equals("max limit: total pages", maxLimit.pagination.pages, 1);
  TestValidator.equals("max limit: data length", maxLimit.data.length, 15);

  // Step 10: Test default values (no page/limit specified)
  const defaultPagination =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {} satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(defaultPagination);

  TestValidator.predicate(
    "default pagination has data",
    defaultPagination.data.length > 0,
  );
  TestValidator.equals(
    "default pagination: total records",
    defaultPagination.pagination.records,
    15,
  );

  // Step 11: Verify all addresses across all pages with limit 5
  const allPagesLimit5 = await ArrayUtil.asyncRepeat(3, async (pageIndex) => {
    const pageResult =
      await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
        connection,
        {
          body: {
            page: pageIndex + 1,
            limit: 5,
          } satisfies IShoppingMallBuyerAddress.IRequest,
        },
      );
    typia.assert(pageResult);
    return pageResult.data;
  });

  const allAddressIds = allPagesLimit5.flat().map((addr) => addr.id);
  const uniqueAddressIds = new Set(allAddressIds);
  TestValidator.equals(
    "all addresses retrieved across pages",
    uniqueAddressIds.size,
    15,
  );
  TestValidator.equals("no missing addresses", allAddressIds.length, 15);
}
