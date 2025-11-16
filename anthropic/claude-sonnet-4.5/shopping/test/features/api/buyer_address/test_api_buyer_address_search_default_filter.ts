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
 * Test filtering buyer addresses by default status.
 *
 * This test validates the `is_default` filter functionality in the buyer
 * address search API. It creates multiple addresses with different default
 * statuses and verifies that filtering works correctly in three scenarios:
 *
 * 1. Filter for default addresses only (is_default: true)
 * 2. Filter for non-default addresses only (is_default: false)
 * 3. No filter - returns all addresses regardless of default status
 *
 * Additionally, it verifies that changing which address is default correctly
 * affects subsequent filter results, ensuring the filter reflects the current
 * state of address default status.
 */
export async function test_api_buyer_address_search_default_filter(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate buyer account
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  // Step 2: Create first address as default
  const defaultAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address_line1: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 7,
          }),
          city: RandomGenerator.name(1),
          postal_code: typia
            .random<
              number &
                tags.Type<"uint32"> &
                tags.Minimum<10000> &
                tags.Maximum<99999>
            >()
            .toString(),
          country: "United States",
          address_label: "Home",
          address_type: "residential",
          is_default: true,
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(defaultAddress);
  TestValidator.predicate(
    "first address should be default",
    defaultAddress.is_default === true,
  );

  // Step 3: Create second address as non-default
  const nonDefaultAddress1 =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address_line1: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 7,
          }),
          city: RandomGenerator.name(1),
          postal_code: typia
            .random<
              number &
                tags.Type<"uint32"> &
                tags.Minimum<10000> &
                tags.Maximum<99999>
            >()
            .toString(),
          country: "United States",
          address_label: "Office",
          address_type: "commercial",
          is_default: false,
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(nonDefaultAddress1);
  TestValidator.predicate(
    "second address should not be default",
    nonDefaultAddress1.is_default === false,
  );

  // Step 4: Create third address as non-default
  const nonDefaultAddress2 =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address_line1: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 7,
          }),
          city: RandomGenerator.name(1),
          postal_code: typia
            .random<
              number &
                tags.Type<"uint32"> &
                tags.Minimum<10000> &
                tags.Maximum<99999>
            >()
            .toString(),
          country: "Canada",
          address_label: "Vacation Home",
          address_type: "residential",
          is_default: false,
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(nonDefaultAddress2);
  TestValidator.predicate(
    "third address should not be default",
    nonDefaultAddress2.is_default === false,
  );

  // Step 5: Test filtering with is_default: true (should return only default address)
  const defaultFilterResult =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          is_default: true,
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(defaultFilterResult);
  TestValidator.equals(
    "should return 1 default address",
    defaultFilterResult.data.length,
    1,
  );
  TestValidator.predicate(
    "returned address should be default",
    defaultFilterResult.data[0].is_default === true,
  );
  TestValidator.equals(
    "should be the default address created",
    defaultFilterResult.data[0].id,
    defaultAddress.id,
  );

  // Step 6: Test filtering with is_default: false (should return only non-default addresses)
  const nonDefaultFilterResult =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          is_default: false,
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(nonDefaultFilterResult);
  TestValidator.equals(
    "should return 2 non-default addresses",
    nonDefaultFilterResult.data.length,
    2,
  );
  TestValidator.predicate(
    "all returned addresses should not be default",
    nonDefaultFilterResult.data.every((addr) => addr.is_default === false),
  );

  // Step 7: Test without is_default filter (should return all addresses)
  const allAddressesResult =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {} satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(allAddressesResult);
  TestValidator.equals(
    "should return all 3 addresses",
    allAddressesResult.data.length,
    3,
  );

  // Step 8: Verify all addresses regardless of default status
  const hasDefault = allAddressesResult.data.some(
    (addr) => addr.is_default === true,
  );
  const hasNonDefault = allAddressesResult.data.some(
    (addr) => addr.is_default === false,
  );
  TestValidator.predicate("should contain default address", hasDefault);
  TestValidator.predicate(
    "should contain non-default addresses",
    hasNonDefault,
  );
}
