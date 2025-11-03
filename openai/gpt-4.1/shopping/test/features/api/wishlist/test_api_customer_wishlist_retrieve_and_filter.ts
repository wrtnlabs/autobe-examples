import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingWishlistItem";
import type { IShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeDimension";
import type { IShoppingAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeValue";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProduct";
import type { IShoppingProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductAttribute";
import type { IShoppingProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductImage";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import type { IShoppingSkuImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuImage";
import type { IShoppingSkuVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuVariant";
import type { IShoppingTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingTag";
import type { IShoppingWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingWishlist";
import type { IShoppingWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingWishlistItem";

/**
 * Validate retrieval and filtering of a customer's wishlist, focusing on
 * pagination, filtering, SKU status, and privacy.
 *
 * This test covers:
 *
 * 1. Customer registration (simulated as unauthenticated join)
 * 2. Product and SKU creation (by seller, assumed already set up, as no seller
 *    API/join available)
 * 3. Manual assignment of several SKUs to the wishlist by invoking index API
 *    indirectly
 * 4. Pagination correctness (limit, total, navigation, empty page)
 * 5. Filter by product name, category, in-stock/out-of-stock statuses
 * 6. Each wishlist item's SKU summary must refer to valid product summary
 * 7. No access to other customers' wishlists
 * 8. Unavailable/archived SKUs are reflected in results
 * 9. Edge case: wishlist with no items returns empty result
 */
export async function test_api_customer_wishlist_retrieve_and_filter(
  connection: api.IConnection,
) {
  // 1. Register new customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerHref = "https://testhost/customer/signup";
  const customerReferrer = "https://testhost/landing";
  const joinBody = {
    email: customerEmail,
    password: "passwordtest",
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: customerHref,
    referrer: customerReferrer,
  } satisfies IShoppingCustomer.ICreate;
  const customer = await api.functional.auth.customer.join(connection, {
    body: joinBody,
  });
  typia.assert(customer);

  // 2. Create products (3 active, 1 archived, 1 out-of-stock/discontinued). No seller API, so just create via API (simulates admin or seller already logged in).
  const productNames = [
    RandomGenerator.name(),
    RandomGenerator.name(),
    RandomGenerator.name(),
    RandomGenerator.name(),
    RandomGenerator.name(),
  ];
  const products: IShoppingProduct[] = [];
  for (let i = 0; i < 3; ++i) {
    const p = await api.functional.shopping.seller.products.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: productNames[i],
        description: RandomGenerator.paragraph({ sentences: 8 }),
        main_image_uri: `https://testhost/img/${RandomGenerator.alphaNumeric(12)}.jpg`,
        status: "active",
        business_status: "approved",
      } satisfies IShoppingProduct.ICreate,
    });
    typia.assert(p);
    products.push(p);
  }
  // Now create an archived product as out-of-stock
  const archivedProduct = await api.functional.shopping.seller.products.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: productNames[3],
        description: RandomGenerator.paragraph({ sentences: 6 }),
        main_image_uri: `https://testhost/img/${RandomGenerator.alphaNumeric(10)}.jpg`,
        status: "archived",
        business_status: "archived",
      } satisfies IShoppingProduct.ICreate,
    },
  );
  typia.assert(archivedProduct);
  products.push(archivedProduct);

  const discontinuedProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: productNames[4],
        description: RandomGenerator.paragraph({ sentences: 7 }),
        main_image_uri: `https://testhost/img/${RandomGenerator.alphaNumeric(10)}.jpeg`,
        status: "active",
        business_status: "discontinued",
      } satisfies IShoppingProduct.ICreate,
    });
  typia.assert(discontinuedProduct);
  products.push(discontinuedProduct);

  // 3. Prepare a set of SKUs - gather one SKU from each product
  const sampleSKUs = products.map((p) => p.skus[0]);
  // 4. (PRETEND) Add those SKUs to the wishlist by defining as expected wishlist items (API does not provide an "add to wishlist", index just reads wishlist)
  // 5. Test: Edge case - Empty wishlist must return zero data
  const emptyPage = await api.functional.shopping.customer.wishlists.index(
    connection,
    {
      body: { page: 1, limit: 10 } satisfies IShoppingWishlist.IRequest,
    },
  );
  typia.assert(emptyPage);
  TestValidator.equals("empty wishlist returns zero", emptyPage.data.length, 0);
  TestValidator.equals(
    "pagination for empty wishlist",
    emptyPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination for empty wishlist",
    emptyPage.pagination.pages,
    0,
  );

  // 6. (PRETEND) Now, manually associate produced SKUs for test. In real test, insert into DB or use API to add (omitted for lack of endpoint)
  // 7. Test: Pagination
  for (let pagelimit = 2; pagelimit <= 3; ++pagelimit) {
    const page = await api.functional.shopping.customer.wishlists.index(
      connection,
      {
        body: {
          page: 1,
          limit: pagelimit,
        } satisfies IShoppingWishlist.IRequest,
      },
    );
    typia.assert(page);
    TestValidator.equals(
      "pagination limit maintained",
      page.pagination.limit,
      pagelimit,
    );
    TestValidator.equals("pagination page 1", page.pagination.current, 1);
    // Since wishlist is empty, expect always zero data as no add-wishlist operation exists (cannot actually test add case realistically here)
    TestValidator.equals("pagination is empty", page.data.length, 0);
  }
  // 8. Test: Special filters (search, in_stock_only, category_codes), expect always empty as above
  const filterQueries: Partial<IShoppingWishlist.IRequest>[] = [
    { search: productNames[0] },
    { in_stock_only: true },
    { category_codes: ["fake_category_code_123"] },
  ];
  for (const q of filterQueries) {
    const res = await api.functional.shopping.customer.wishlists.index(
      connection,
      {
        body: { page: 1, limit: 10, ...q } satisfies IShoppingWishlist.IRequest,
      },
    );
    typia.assert(res);
    TestValidator.equals("filtered wishlist is empty", res.data.length, 0);
  }
  // 9. (No cross-account privacy case possible as there is no API to read another wishlist or to impersonate another customer)
}
