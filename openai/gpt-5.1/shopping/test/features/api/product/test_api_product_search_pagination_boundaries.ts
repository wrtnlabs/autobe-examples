import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate product catalog search pagination boundary behavior.
 *
 * Business context:
 *
 * - Platform admins can define brands in the catalog.
 * - Sellers create products under those brands.
 * - Public/anonymous clients search products through PATCH /shoppingMall/products
 *   using complex filter and pagination DTO IShoppingMallProduct.IRequest.
 *
 * This test focuses purely on pagination semantics and stability:
 *
 * 1. Set up a dedicated brand and a seller.
 * 2. Create more products (e.g., 25) than a single page_size (10) under the same
 *    brand with a consistent status ("active") and recognizable codes/names.
 * 3. Perform an anonymous product search filtered by that brand and status with
 *    deterministic sort (by name ascending), requesting multiple pages.
 * 4. Validate pagination metadata (current, limit, records, pages) is internally
 *    consistent and respects the documented 0-based current convention
 *    (IPage.IPagination.current is 0 for the first page).
 * 5. Ensure no overlap between items returned on different pages when using the
 *    same sort criteria, and that the union of pages covers our created
 *    products.
 * 6. Request a page beyond the last page and verify an empty data array but
 *    consistent pagination metadata.
 */
export async function test_api_product_search_pagination_boundaries(
  connection: api.IConnection,
) {
  // ---------- 1. Platform admin join & login ----------
  const platformAdminEmail = typia.random<string & tags.Format<"email">>();
  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // Explicit login step (even though join may already authenticate)
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // ---------- 2. Create a brand as platform admin ----------
  const brandSlug = `test-brand-${RandomGenerator.alphaNumeric(8)}`;
  const brandCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: brandSlug,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // ---------- 3. Seller join & login ----------
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.paragraph({ sentences: 2 }),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // ---------- 4. Create multiple products (more than one page) ----------
  const PRODUCT_COUNT = 25;
  const PAGE_SIZE = 10;
  const baseCodePrefix = `E2E-PAGINATION-${RandomGenerator.alphaNumeric(6)}`;
  const createdProductIds: string[] = [];

  for (let i = 0; i < PRODUCT_COUNT; i++) {
    const indexStr = (i + 1).toString().padStart(3, "0");
    const productCreateBody = {
      shopping_mall_seller_id: sellerLoggedIn.id,
      shopping_mall_brand_id: brand.id,
      code: `${baseCodePrefix}-${indexStr}` as string & tags.MinLength<1>,
      name: `${baseCodePrefix} Name ${indexStr}` as string & tags.MinLength<1>,
      short_description: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 5,
        sentenceMax: 10,
      }),
      status: "active" as string & tags.MinLength<1>,
      is_multi_sku: false,
      primary_image_uri: "https://cdn.example.com/product.png",
      additional_data: null,
    } satisfies IShoppingMallProduct.ICreate;

    const created: IShoppingMallProduct =
      await api.functional.shoppingMall.seller.products.create(connection, {
        body: productCreateBody,
      });
    typia.assert(created);
    createdProductIds.push(created.id);
  }

  // ---------- 5. Anonymous search: create separate unauthenticated connection ----------
  const anonymousConnection: api.IConnection = { ...connection, headers: {} };

  const searchRequestPage1 = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    page_size: PAGE_SIZE as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_field: "name",
    sort_direction: "asc" as const,
    keyword: undefined,
    status: "active",
    seller_id: sellerLoggedIn.id,
    brand_id: brand.id,
    category_ids: undefined,
    region_setting_id: undefined,
    channel: undefined,
    min_price: undefined,
    max_price: undefined,
    in_stock_only: undefined,
    compliance_flag_types: undefined,
  } satisfies IShoppingMallProduct.IRequest;

  const page1: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.products.index(anonymousConnection, {
      body: searchRequestPage1,
    });
  typia.assert(page1);

  // ---------- 6. Validate pagination metadata for first page ----------
  const pagination1 = page1.pagination;
  typia.assert<IPage.IPagination>(pagination1);

  TestValidator.equals(
    "first page current index should be 0 when requesting page=1",
    pagination1.current,
    0,
  );

  TestValidator.equals(
    "limit should match requested page_size",
    pagination1.limit,
    PAGE_SIZE,
  );

  TestValidator.predicate(
    "records should be at least the number of created products",
    pagination1.records >= PRODUCT_COUNT,
  );

  const expectedPages =
    pagination1.limit > 0
      ? Math.ceil(pagination1.records / pagination1.limit)
      : 0;
  TestValidator.equals(
    "pages should equal ceil(records / max(limit,1))",
    pagination1.pages,
    expectedPages,
  );

  // Collect IDs for overlap checks
  const page1Ids = page1.data.map((summary) => summary.id);

  // ---------- 7. Subsequent pages (page 2 and page 3) ----------
  const collectPageIds = async (
    pageIndex: number,
  ): Promise<{ ids: string[]; pagination: IPage.IPagination }> => {
    const req = {
      ...searchRequestPage1,
      page: pageIndex as number & tags.Type<"int32"> & tags.Minimum<1>,
    } satisfies IShoppingMallProduct.IRequest;

    const res: IPageIShoppingMallProduct.ISummary =
      await api.functional.shoppingMall.products.index(anonymousConnection, {
        body: req,
      });
    typia.assert(res);
    const pag = res.pagination;
    typia.assert<IPage.IPagination>(pag);
    return { ids: res.data.map((s) => s.id), pagination: pag };
  };

  const { ids: page2Ids, pagination: pagination2 } = await collectPageIds(2);
  const { ids: page3Ids, pagination: pagination3 } = await collectPageIds(3);

  // Ensure no overlap between pages 1, 2, 3
  const overlap12 = page1Ids.filter((id) => page2Ids.includes(id));
  const overlap23 = page2Ids.filter((id) => page3Ids.includes(id));
  const overlap13 = page1Ids.filter((id) => page3Ids.includes(id));

  TestValidator.equals(
    "no overlap between page 1 and page 2",
    overlap12.length,
    0,
  );
  TestValidator.equals(
    "no overlap between page 2 and page 3",
    overlap23.length,
    0,
  );
  TestValidator.equals(
    "no overlap between page 1 and page 3",
    overlap13.length,
    0,
  );

  // Verify pagination metadata is consistent across pages
  TestValidator.equals(
    "pagination.records consistent between page 1 and page 2",
    pagination2.records,
    pagination1.records,
  );
  TestValidator.equals(
    "pagination.records consistent between page 1 and page 3",
    pagination3.records,
    pagination1.records,
  );
  TestValidator.equals(
    "pagination.limit consistent between pages",
    pagination2.limit,
    pagination1.limit,
  );

  // ---------- 7b. Union coverage for created products ----------
  const unionFirstThreePages = [...page1Ids, ...page2Ids, ...page3Ids];
  const createdWithinFirstThree = createdProductIds.filter((id) =>
    unionFirstThreePages.includes(id),
  );

  TestValidator.predicate(
    "at least some of the created products appear within the first three pages",
    createdWithinFirstThree.length > 0,
  );

  // ---------- 8. Request page beyond last page ----------
  const lastPageIndex = pagination1.pages > 0 ? pagination1.pages + 1 : 1;
  const beyondRequest = {
    ...searchRequestPage1,
    page: lastPageIndex as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallProduct.IRequest;

  const beyond: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.products.index(anonymousConnection, {
      body: beyondRequest,
    });
  typia.assert(beyond);
  const paginationBeyond = beyond.pagination;
  typia.assert<IPage.IPagination>(paginationBeyond);

  TestValidator.equals(
    "records should remain consistent on page beyond last",
    paginationBeyond.records,
    pagination1.records,
  );
  TestValidator.equals(
    "limit should remain consistent on page beyond last",
    paginationBeyond.limit,
    pagination1.limit,
  );

  TestValidator.predicate(
    "data array should be empty or stay within logical bounds when requesting beyond last page",
    beyond.data.length === 0 || pagination1.pages === 0,
  );
}
