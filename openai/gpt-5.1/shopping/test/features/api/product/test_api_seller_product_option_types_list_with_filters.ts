import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductOptionType";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Verify listing and filtering of product option types for a seller product.
 *
 * This E2E test exercises PATCH
 * /shoppingMall/seller/products/{productCode}/optionTypes to ensure that the
 * search and is_active filters are correctly applied when listing option types
 * for a given product.
 *
 * High-level flow:
 *
 * 1. Join as a seller so we can create a product and its option types.
 * 2. Join/login as a platform admin and create a brand.
 * 3. Switch back to the seller and create a multi-SKU product associated with the
 *    brand.
 * 4. Create several option types (Color, Size, LegacyOption) for that product.
 * 5. Call the index endpoint with search="Color" and is_active=true and assert
 *    that only the Color option type is returned.
 * 6. Call the index endpoint again with an empty search and ensure all option
 *    types are visible.
 * 7. Call index with search="Legacy" and assert that only LegacyOption-like
 *    entries appear.
 */
export async function test_api_seller_product_option_types_list_with_filters(
  connection: api.IConnection,
) {
  // 1. Register a seller
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword: string = "SellerPassword!123";
  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 2. Register a platform admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "AdminPassword!123";
  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(2),
    password: adminPassword,
    ip: null,
    href: "https://admin.join.example.com/",
    referrer: "https://landing.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Explicit platform admin login to ensure session context
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.login.example.com/",
    referrer: "https://landing.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const adminLoginAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 3. Create a brand as platform admin
  const brandCreateBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 4. Switch back to seller for product creation via explicit login
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.login.example.com/",
    referrer: "https://landing.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;
  const sellerLoginAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAuthorized);

  // 5. Create a product for the seller
  const productCode: string = `PROD-${RandomGenerator.alphaNumeric(8)}`;
  const productCreateBody = {
    shopping_mall_seller_id: sellerLoginAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name: RandomGenerator.paragraph({ sentences: 2 }) as string &
      tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);
  TestValidator.equals(
    "created product code should match requested code",
    product.code,
    productCode,
  );

  // 6. Create option types for the product: Color, Size, LegacyOption
  const colorOptionBody = {
    name: "Color",
    display_name: "Color",
    display_order: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;
  const sizeOptionBody = {
    name: "Size",
    display_name: "Size",
    display_order: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;
  const legacyOptionBody = {
    name: "LegacyOption",
    display_name: "Legacy Option",
    display_order: 3 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const colorOption: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode,
        body: colorOptionBody,
      },
    );
  typia.assert(colorOption);

  const sizeOption: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode,
        body: sizeOptionBody,
      },
    );
  typia.assert(sizeOption);

  const legacyOption: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode,
        body: legacyOptionBody,
      },
    );
  typia.assert(legacyOption);

  // 7. Query option types with search="Color" and is_active=true
  const searchTermColor = "Color" as string & tags.MaxLength<256>;
  const filterColorBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
    search: searchTermColor,
    is_active: true,
    order_by: "display_order" as string & tags.MaxLength<64>,
    order_direction: "asc" as string & tags.MaxLength<32>,
  } satisfies IShoppingMallProductOptionType.IRequest;

  const colorPage: IPageIShoppingMallProductOptionType.ISummary =
    await api.functional.shoppingMall.seller.products.optionTypes.index(
      connection,
      {
        productCode,
        body: filterColorBody,
      },
    );
  typia.assert(colorPage);

  const colorPagination = colorPage.pagination;
  const colorData = colorPage.data;

  TestValidator.predicate(
    "Color search should return at least one record",
    colorPagination.records >= 1 && colorData.length >= 1,
  );

  // All returned names should include the search term and only Color should appear
  for (const item of colorData) {
    TestValidator.predicate(
      "each option type name for Color search contains 'Color'",
      item.name.includes("Color") ||
        (item.display_name !== undefined &&
          item.display_name !== null &&
          item.display_name.includes("Color")),
    );
  }

  const hasColor = colorData.some((item) => item.name === "Color");
  TestValidator.predicate(
    "result set for Color search must contain Color option type",
    hasColor,
  );

  const hasSizeOrLegacy = colorData.some(
    (item) => item.name === "Size" || item.name === "LegacyOption",
  );
  TestValidator.predicate(
    "result set for Color search must not contain Size or LegacyOption",
    !hasSizeOrLegacy,
  );

  // 8. Query option types with empty search (all option types should be visible)
  const filterAllBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
    search: "" as string & tags.MaxLength<256>,
    is_active: true,
    order_by: "display_order" as string & tags.MaxLength<64>,
    order_direction: "asc" as string & tags.MaxLength<32>,
  } satisfies IShoppingMallProductOptionType.IRequest;

  const allPage: IPageIShoppingMallProductOptionType.ISummary =
    await api.functional.shoppingMall.seller.products.optionTypes.index(
      connection,
      {
        productCode,
        body: filterAllBody,
      },
    );
  typia.assert(allPage);

  const allData = allPage.data;

  TestValidator.predicate(
    "all option types query should return at least three records",
    allData.length >= 3,
  );

  const names = allData.map((item) => item.name);
  TestValidator.predicate(
    "all option types query should contain Color, Size, and LegacyOption",
    names.includes("Color") &&
      names.includes("Size") &&
      names.includes("LegacyOption"),
  );

  // 9. Query with search="Legacy" to ensure only LegacyOption-like entries appear
  const legacySearchTerm = "Legacy" as string & tags.MaxLength<256>;
  const filterLegacyBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
    search: legacySearchTerm,
    is_active: true,
    order_by: "display_order" as string & tags.MaxLength<64>,
    order_direction: "asc" as string & tags.MaxLength<32>,
  } satisfies IShoppingMallProductOptionType.IRequest;

  const legacyPage: IPageIShoppingMallProductOptionType.ISummary =
    await api.functional.shoppingMall.seller.products.optionTypes.index(
      connection,
      {
        productCode,
        body: filterLegacyBody,
      },
    );
  typia.assert(legacyPage);

  const legacyData = legacyPage.data;
  TestValidator.predicate(
    "Legacy search should return at least one record",
    legacyData.length >= 1,
  );

  const hasOnlyLegacyNames = legacyData.every(
    (item) =>
      item.name.includes("Legacy") ||
      (item.display_name !== undefined &&
        item.display_name !== null &&
        item.display_name.includes("Legacy")),
  );
  TestValidator.predicate(
    "Legacy search results should only contain Legacy option types",
    hasOnlyLegacyNames,
  );
}
