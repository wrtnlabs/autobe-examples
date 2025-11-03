import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingSellerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingSellerAddress";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeDimension";
import type { IShoppingAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeValue";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";
import type { IShoppingProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProduct";
import type { IShoppingProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductAttribute";
import type { IShoppingProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductImage";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingSellerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSellerAddress";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import type { IShoppingSkuImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuImage";
import type { IShoppingSkuVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuVariant";
import type { IShoppingTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingTag";

export async function test_api_seller_address_listing_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      role: "super",
      status: "active",
    },
  });
  typia.assert(admin);

  // 2. Register seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      status: "pending",
    },
  });
  typia.assert(seller);

  // 3. Seller creates a product (ensures sellerId and allows address association)
  const product = await api.functional.shopping.seller.products.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        main_image_uri: `https://img/${RandomGenerator.alphaNumeric(8)}.png`,
        status: "draft",
        business_status: "in_review",
      },
    },
  );
  typia.assert(product);

  // 4. Admin registers multiple addresses for the seller
  const addressInputs = [
    {
      is_primary: true,
      is_return_address: false,
      city: "Seoul",
      state: "Seoul",
      country: "South Korea",
    },
    {
      is_primary: false,
      is_return_address: true,
      city: "Incheon",
      state: "Incheon",
      country: "South Korea",
    },
    {
      is_primary: false,
      is_return_address: false,
      city: "Busan",
      state: "Busan",
      country: "South Korea",
    },
  ];
  const createdAddresses: IShoppingSellerAddress[] = [];
  for (const addr of addressInputs) {
    const created =
      await api.functional.shopping.admin.sellers.addresses.create(connection, {
        sellerId: seller.id,
        body: {
          address_line1: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 10,
            wordMax: 15,
          }),
          address_line2: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 10,
          }),
          city: addr.city,
          state: addr.state,
          postal_code: RandomGenerator.alphaNumeric(7),
          country: addr.country,
          is_primary: addr.is_primary,
          is_return_address: addr.is_return_address,
          phone: RandomGenerator.mobile(),
          recipient_name: RandomGenerator.name(),
        },
      });
    typia.assert(created);
    createdAddresses.push(created);
  }

  // 5. Admin lists all addresses for the seller
  const fullList = await api.functional.shopping.admin.sellers.addresses.index(
    connection,
    {
      sellerId: seller.id,
      body: {
        // no filter, get all
      },
    },
  );
  typia.assert(fullList);
  TestValidator.predicate(
    "admin gets all addresses (no filter)",
    fullList.data.length >= createdAddresses.length &&
      ArrayUtil.has(createdAddresses, (addr) =>
        fullList.data.some((a) => a.id === addr.id),
      ),
  );

  // 6. Filtering: get only primary address
  const primaryList =
    await api.functional.shopping.admin.sellers.addresses.index(connection, {
      sellerId: seller.id,
      body: { is_primary: true },
    });
  typia.assert(primaryList);
  TestValidator.predicate(
    "admin filters primary address only",
    primaryList.data.every((a) => a.is_primary),
  );

  // 7. Filtering: get only return addresses
  const returnList =
    await api.functional.shopping.admin.sellers.addresses.index(connection, {
      sellerId: seller.id,
      body: { is_return_address: true },
    });
  typia.assert(returnList);
  TestValidator.predicate(
    "admin filters return addresses only",
    returnList.data.every((a) => a.is_return_address),
  );

  // 8. Pagination
  const paginated = await api.functional.shopping.admin.sellers.addresses.index(
    connection,
    {
      sellerId: seller.id,
      body: { page: 1, limit: 2 },
    },
  );
  typia.assert(paginated);
  TestValidator.equals("pagination reflects limit", paginated.data.length, 2);
  TestValidator.equals("current page is 1", paginated.pagination.current, 1);

  // 9. Sorting (by city ascending)
  const sortedAsc = await api.functional.shopping.admin.sellers.addresses.index(
    connection,
    {
      sellerId: seller.id,
      body: { sort_by: "city", sort_order: "asc" },
    },
  );
  typia.assert(sortedAsc);
  const cityAsc = [...sortedAsc.data].map((a) => a.city);
  const expectedAsc = [...cityAsc].sort();
  TestValidator.equals(
    "addresses sorted by city ascending",
    cityAsc,
    expectedAsc,
  );

  // 10. Sorting (by city descending)
  const sortedDesc =
    await api.functional.shopping.admin.sellers.addresses.index(connection, {
      sellerId: seller.id,
      body: { sort_by: "city", sort_order: "desc" },
    });
  typia.assert(sortedDesc);
  const cityDesc = [...sortedDesc.data].map((a) => a.city);
  const expectedDesc = [...cityDesc].sort().reverse();
  TestValidator.equals(
    "addresses sorted by city descending",
    cityDesc,
    expectedDesc,
  );

  // 11. Privacy/Security: fields do not expose sensitive info (only defined fields present)
  if (fullList.data.length > 0) {
    for (const addr of fullList.data) {
      TestValidator.equals(
        "address object has only declared properties",
        Object.keys(addr).sort(),
        [
          "id",
          "shopping_seller_id",
          "address_line1",
          "address_line2",
          "city",
          "state",
          "postal_code",
          "country",
          "is_return_address",
          "is_primary",
          "phone",
          "recipient_name",
          "created_at",
          "updated_at",
          "deleted_at",
        ].sort(),
      );
    }
  }
}
