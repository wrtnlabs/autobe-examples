import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingSellerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingSellerAddress";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingSellerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSellerAddress";

/**
 * Validate seller can list their own addresses with filters and paging.
 *
 * 1. Register as a seller (join), storing sellerId and credentials
 * 2. Register a business address and a return address
 * 3. List addresses for this seller using the listing API
 * 4. Validate results - returned addresses belong to the seller only
 * 5. Test pagination via page/limit options
 * 6. Test filtering (is_primary, is_return_address, city, country)
 * 7. Switch context: try as unauthenticated user to access same resource
 * 8. Confirm unauthorized access blocked for other users
 */
export async function test_api_seller_retrieve_own_addresses_list(
  connection: api.IConnection,
) {
  // 1. Register as seller
  const email = `${RandomGenerator.alphabets(10)}@test-business.com`;
  const sellerAuth: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email,
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        contact_phone: RandomGenerator.mobile(),
        status: "pending",
      } satisfies IShoppingSeller.IJoin,
    });
  typia.assert<IShoppingSeller.IAuthorized>(sellerAuth);
  const sellerId = sellerAuth.id;

  // 2. Register two address types for this seller
  const primaryAddress =
    await api.functional.shopping.seller.sellers.addresses.create(connection, {
      sellerId,
      body: {
        address_line1: RandomGenerator.paragraph({ sentences: 2 }),
        address_line2: null,
        city: RandomGenerator.paragraph({ sentences: 1 }),
        state: RandomGenerator.paragraph({ sentences: 1 }),
        postal_code: RandomGenerator.alphaNumeric(6),
        country: "South Korea",
        is_primary: true,
        is_return_address: false,
        phone: RandomGenerator.mobile(),
        recipient_name: RandomGenerator.name(),
      } satisfies IShoppingSellerAddress.ICreate,
    });
  typia.assert<IShoppingSellerAddress>(primaryAddress);

  const returnAddress =
    await api.functional.shopping.seller.sellers.addresses.create(connection, {
      sellerId,
      body: {
        address_line1: RandomGenerator.paragraph({ sentences: 2 }),
        address_line2: "Bldg. 2, 3F",
        city: "Seoul",
        state: "Seoul",
        postal_code: RandomGenerator.alphaNumeric(6),
        country: "South Korea",
        is_primary: false,
        is_return_address: true,
        phone: RandomGenerator.mobile(),
        recipient_name: RandomGenerator.name(),
      } satisfies IShoppingSellerAddress.ICreate,
    });
  typia.assert<IShoppingSellerAddress>(returnAddress);

  // 3. List all addresses for this seller (no filter, page=1, limit=10)
  const addressList: IPageIShoppingSellerAddress =
    await api.functional.shopping.seller.sellers.addresses.index(connection, {
      sellerId,
      body: {
        page: 1 as number & tags.Type<"int32">,
        limit: 10 as number & tags.Type<"int32">,
      },
    });
  typia.assert<IPageIShoppingSellerAddress>(addressList);
  TestValidator.predicate(
    "all addresses belong to seller",
    addressList.data.every((addr) => addr.shopping_seller_id === sellerId),
  );
  TestValidator.equals(
    "addresses count >= 2",
    addressList.data.length >= 2,
    true,
  );

  // 4. Test filter: is_primary
  const primaryList =
    await api.functional.shopping.seller.sellers.addresses.index(connection, {
      sellerId,
      body: {
        is_primary: true,
        page: 1 as number & tags.Type<"int32">,
        limit: 5 as number & tags.Type<"int32">,
      },
    });
  typia.assert(primaryList);
  TestValidator.predicate(
    "all returned addresses are primary",
    primaryList.data.every((addr) => addr.is_primary === true),
  );

  // 5. Test filter: is_return_address, city
  const returnList =
    await api.functional.shopping.seller.sellers.addresses.index(connection, {
      sellerId,
      body: {
        is_return_address: true,
        city: "Seoul",
        page: 1 as number & tags.Type<"int32">,
        limit: 5 as number & tags.Type<"int32">,
      },
    });
  typia.assert(returnList);
  TestValidator.predicate(
    "all returned are return addresses in city",
    returnList.data.every(
      (addr) =>
        addr.is_return_address === true &&
        addr.city.toLowerCase().includes("seoul"),
    ),
  );

  // 6. Pagination: Add additional addresses and validate paging
  for (let i = 0; i < 7; ++i) {
    await api.functional.shopping.seller.sellers.addresses.create(connection, {
      sellerId,
      body: {
        address_line1: RandomGenerator.paragraph({ sentences: 2 }),
        address_line2:
          i % 2 === 0 ? null : RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.paragraph({ sentences: 1 }),
        state: RandomGenerator.paragraph({ sentences: 1 }),
        postal_code: RandomGenerator.alphaNumeric(6),
        country: i % 2 === 0 ? "South Korea" : "Japan",
        is_primary: false,
        is_return_address: false,
        phone: RandomGenerator.mobile(),
        recipient_name: RandomGenerator.name(),
      } satisfies IShoppingSellerAddress.ICreate,
    });
  }
  const pagedList =
    await api.functional.shopping.seller.sellers.addresses.index(connection, {
      sellerId,
      body: {
        page: 2 as number & tags.Type<"int32">,
        limit: 5 as number & tags.Type<"int32">,
      },
    });
  typia.assert(pagedList);
  TestValidator.equals(
    "pagination page=2 limit=5",
    pagedList.pagination.current,
    2,
  );
  TestValidator.equals("pagination limit=5", pagedList.pagination.limit, 5);
  TestValidator.predicate(
    "paged addresses belong to seller",
    pagedList.data.every((addr) => addr.shopping_seller_id === sellerId),
  );

  // 7. Try to access as unauthenticated/other user: should be unauthorized
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated users cannot access addresses",
    async () => {
      await api.functional.shopping.seller.sellers.addresses.index(unauthConn, {
        sellerId,
        body: {
          page: 1 as number & tags.Type<"int32">,
          limit: 5 as number & tags.Type<"int32">,
        },
      });
    },
  );
}
