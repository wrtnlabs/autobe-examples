import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAddress";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_address_search_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate seller account
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
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

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Step 2: Create 25 addresses to test pagination properly
  const addressCount = 25;
  const createdAddresses = await ArrayUtil.asyncRepeat(
    addressCount,
    async (index) => {
      const addressData = {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        address_line1: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.name(1)} Street`,
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
        country: RandomGenerator.pick([
          "United States",
          "Canada",
          "United Kingdom",
        ] as const),
      } satisfies IShoppingMallAddress.ICreate;

      const address = await api.functional.shoppingMall.seller.addresses.create(
        connection,
        {
          body: addressData,
        },
      );
      typia.assert(address);
      return address;
    },
  );

  // Step 3: Test first page with default pagination
  const firstPageRequest = {} satisfies IShoppingMallAddress.IRequest;
  const firstPage = await api.functional.shoppingMall.seller.addresses.index(
    connection,
    {
      body: firstPageRequest,
    },
  );
  typia.assert(firstPage);

  // Step 4: Validate pagination metadata structure
  TestValidator.predicate(
    "pagination metadata exists",
    firstPage.pagination !== null && firstPage.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination has current page",
    typeof firstPage.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination has limit",
    typeof firstPage.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination has total records",
    typeof firstPage.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination has total pages",
    typeof firstPage.pagination.pages === "number",
  );

  // Step 5: Validate total count matches created addresses
  TestValidator.equals(
    "total records match created count",
    firstPage.pagination.records,
    addressCount,
  );

  // Step 6: Validate page calculation is correct
  const expectedPages = Math.ceil(addressCount / firstPage.pagination.limit);
  TestValidator.equals(
    "total pages calculated correctly",
    firstPage.pagination.pages,
    expectedPages,
  );

  // Step 7: Validate first page data
  TestValidator.predicate("first page has data", firstPage.data.length > 0);
  TestValidator.predicate(
    "first page data within limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );

  // Step 8: Test second page if multiple pages exist
  if (firstPage.pagination.pages > 1) {
    const secondPageRequest = {
      page: 1,
    } satisfies IShoppingMallAddress.IRequest;

    const secondPage = await api.functional.shoppingMall.seller.addresses.index(
      connection,
      {
        body: secondPageRequest,
      },
    );
    typia.assert(secondPage);

    // Step 9: Validate second page metadata
    TestValidator.equals(
      "second page current number",
      secondPage.pagination.current,
      1,
    );
    TestValidator.equals(
      "second page has same total records",
      secondPage.pagination.records,
      addressCount,
    );

    // Step 10: Validate non-overlapping data between pages
    const firstPageIds = firstPage.data.map((addr) => addr.id);
    const secondPageIds = secondPage.data.map((addr) => addr.id);

    const hasOverlap = firstPageIds.some((id) => secondPageIds.includes(id));
    TestValidator.predicate(
      "no overlapping addresses between pages",
      !hasOverlap,
    );

    // Step 11: Validate all addresses are unique across pages
    const allIds = [...firstPageIds, ...secondPageIds];
    const uniqueIds = new Set(allIds);
    TestValidator.equals(
      "all addresses unique across pages",
      uniqueIds.size,
      allIds.length,
    );
  }

  // Step 12: Collect all addresses from all pages to verify completeness
  const allPagesData: IShoppingMallAddress[] = [];
  for (let pageNum = 0; pageNum < firstPage.pagination.pages; pageNum++) {
    const pageRequest = {
      page: pageNum,
    } satisfies IShoppingMallAddress.IRequest;

    const pageResult = await api.functional.shoppingMall.seller.addresses.index(
      connection,
      {
        body: pageRequest,
      },
    );
    typia.assert(pageResult);
    allPagesData.push(...pageResult.data);
  }

  // Step 13: Validate total addresses retrieved matches total count
  TestValidator.equals(
    "all pages combined match total count",
    allPagesData.length,
    addressCount,
  );

  // Step 14: Validate all addresses are unique across all pages
  const allAddressIds = allPagesData.map((addr) => addr.id);
  const uniqueAllIds = new Set(allAddressIds);
  TestValidator.equals(
    "all addresses unique across all pages",
    uniqueAllIds.size,
    addressCount,
  );
}
