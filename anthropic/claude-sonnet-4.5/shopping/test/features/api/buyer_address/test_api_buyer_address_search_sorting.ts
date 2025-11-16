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
 * Test sorting functionality of buyer address search API.
 *
 * This test validates that the buyer address search endpoint correctly sorts
 * addresses by different fields (created_at, updated_at, recipient_name, city)
 * in both ascending and descending order. It also verifies that default sorting
 * (created_at desc) is applied when sort parameters are not specified.
 *
 * Test workflow:
 *
 * 1. Create a buyer account for authentication
 * 2. Create multiple addresses with distinct sortable field values
 * 3. Add delays between creations to ensure different timestamps
 * 4. Test sorting by created_at (asc and desc)
 * 5. Test sorting by recipient_name (asc and desc)
 * 6. Test sorting by city (asc and desc)
 * 7. Verify default sorting behavior
 * 8. Validate correct order in all scenarios
 */
export async function test_api_buyer_address_search_sorting(
  connection: api.IConnection,
) {
  // 1. Create buyer account for authentication
  const buyerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: typia.random<string & tags.MinLength<2> & tags.MaxLength<100>>(),
    phone_number: RandomGenerator.mobile(),
    href: "https://example.com/register" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com" satisfies string & tags.Format<"uri">,
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer = await api.functional.auth.buyer.join(connection, {
    body: buyerData,
  });
  typia.assert(buyer);

  // 2. Create multiple addresses with distinct values for sorting
  const addressNames = [
    "Alice Smith",
    "Bob Johnson",
    "Charlie Davis",
    "Diana Wilson",
  ] as const;
  const cities = ["Atlanta", "Boston", "Chicago", "Denver"] as const;
  const createdAddresses: IShoppingMallBuyerAddress[] = [];

  for (let i = 0; i < addressNames.length; i++) {
    const addressData = {
      recipient_name: addressNames[i],
      phone: RandomGenerator.mobile(),
      street_address_line1: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} Main Street`,
      city: cities[i],
      postal_code: typia.random<string & tags.MaxLength<20>>(),
      country: "United States",
      address_label: `Address ${i + 1}`,
      address_type: "residential",
      is_default: i === 0,
    } satisfies IShoppingMallBuyerAddress.ICreate;

    const address =
      await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
        connection,
        { body: addressData },
      );
    typia.assert(address);
    createdAddresses.push(address);

    // Add delay to ensure different created_at timestamps (increased to 150ms for reliability)
    if (i < addressNames.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }

  // 3. Test sorting by created_at descending (most recent first)
  const sortByCreatedDesc =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(sortByCreatedDesc);
  TestValidator.predicate(
    "created_at desc - should return all 4 addresses",
    sortByCreatedDesc.data.length === 4,
  );

  TestValidator.equals(
    "created_at desc - first address should be most recent",
    sortByCreatedDesc.data[0].recipient_name,
    "Diana Wilson",
  );
  TestValidator.equals(
    "created_at desc - last address should be oldest",
    sortByCreatedDesc.data[sortByCreatedDesc.data.length - 1].recipient_name,
    "Alice Smith",
  );

  // 4. Test sorting by created_at ascending (oldest first)
  const sortByCreatedAsc =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "asc",
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(sortByCreatedAsc);
  TestValidator.predicate(
    "created_at asc - should return all 4 addresses",
    sortByCreatedAsc.data.length === 4,
  );

  TestValidator.equals(
    "created_at asc - first address should be oldest",
    sortByCreatedAsc.data[0].recipient_name,
    "Alice Smith",
  );
  TestValidator.equals(
    "created_at asc - last address should be most recent",
    sortByCreatedAsc.data[sortByCreatedAsc.data.length - 1].recipient_name,
    "Diana Wilson",
  );

  // 5. Test sorting by recipient_name ascending (A-Z)
  const sortByNameAsc =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          sort_by: "recipient_name",
          sort_order: "asc",
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(sortByNameAsc);
  TestValidator.predicate(
    "recipient_name asc - should return all 4 addresses",
    sortByNameAsc.data.length === 4,
  );

  TestValidator.equals(
    "recipient_name asc - first should be Alice",
    sortByNameAsc.data[0].recipient_name,
    "Alice Smith",
  );
  TestValidator.equals(
    "recipient_name asc - second should be Bob",
    sortByNameAsc.data[1].recipient_name,
    "Bob Johnson",
  );
  TestValidator.equals(
    "recipient_name asc - third should be Charlie",
    sortByNameAsc.data[2].recipient_name,
    "Charlie Davis",
  );
  TestValidator.equals(
    "recipient_name asc - fourth should be Diana",
    sortByNameAsc.data[3].recipient_name,
    "Diana Wilson",
  );

  // 6. Test sorting by recipient_name descending (Z-A)
  const sortByNameDesc =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          sort_by: "recipient_name",
          sort_order: "desc",
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(sortByNameDesc);
  TestValidator.predicate(
    "recipient_name desc - should return all 4 addresses",
    sortByNameDesc.data.length === 4,
  );

  TestValidator.equals(
    "recipient_name desc - first should be Diana",
    sortByNameDesc.data[0].recipient_name,
    "Diana Wilson",
  );
  TestValidator.equals(
    "recipient_name desc - last should be Alice",
    sortByNameDesc.data[sortByNameDesc.data.length - 1].recipient_name,
    "Alice Smith",
  );

  // 7. Test sorting by city ascending (A-Z)
  const sortByCityAsc =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          sort_by: "city",
          sort_order: "asc",
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(sortByCityAsc);
  TestValidator.predicate(
    "city asc - should return all 4 addresses",
    sortByCityAsc.data.length === 4,
  );

  TestValidator.equals(
    "city asc - first should be Atlanta",
    sortByCityAsc.data[0].city,
    "Atlanta",
  );
  TestValidator.equals(
    "city asc - second should be Boston",
    sortByCityAsc.data[1].city,
    "Boston",
  );
  TestValidator.equals(
    "city asc - third should be Chicago",
    sortByCityAsc.data[2].city,
    "Chicago",
  );
  TestValidator.equals(
    "city asc - fourth should be Denver",
    sortByCityAsc.data[3].city,
    "Denver",
  );

  // 8. Test sorting by city descending (Z-A)
  const sortByCityDesc =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {
          sort_by: "city",
          sort_order: "desc",
        } satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(sortByCityDesc);
  TestValidator.predicate(
    "city desc - should return all 4 addresses",
    sortByCityDesc.data.length === 4,
  );

  TestValidator.equals(
    "city desc - first should be Denver",
    sortByCityDesc.data[0].city,
    "Denver",
  );
  TestValidator.equals(
    "city desc - last should be Atlanta",
    sortByCityDesc.data[sortByCityDesc.data.length - 1].city,
    "Atlanta",
  );

  // 9. Test default sorting (no sort parameters - should default to created_at desc)
  const defaultSort =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.index(
      connection,
      {
        body: {} satisfies IShoppingMallBuyerAddress.IRequest,
      },
    );
  typia.assert(defaultSort);
  TestValidator.predicate(
    "default sort - should return all 4 addresses",
    defaultSort.data.length === 4,
  );

  TestValidator.equals(
    "default sort - first address should be most recent (Diana)",
    defaultSort.data[0].recipient_name,
    "Diana Wilson",
  );
  TestValidator.equals(
    "default sort - last address should be oldest (Alice)",
    defaultSort.data[defaultSort.data.length - 1].recipient_name,
    "Alice Smith",
  );
}
