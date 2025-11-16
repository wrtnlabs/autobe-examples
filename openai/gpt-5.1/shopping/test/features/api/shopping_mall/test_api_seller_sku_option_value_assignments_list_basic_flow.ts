import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSkuOptionValueAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSkuOptionValueAssignment";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";
import type { IShoppingMallSkuOptionValueAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOptionValueAssignment";

export async function test_api_seller_sku_option_value_assignments_list_basic_flow(
  connection: api.IConnection,
) {
  // 1. Seller join (and implicit authentication)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  // 2. Platform admin join and login
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  const platformAdminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 3. Create a brand as platform admin
  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.example.com/logo/" + RandomGenerator.alphaNumeric(8),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 4. Switch back to seller (login explicitly to be safe)
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 5. Create a product under this seller, associated to the brand
  const productCode = `PRD-${RandomGenerator.alphaNumeric(8)}`;
  const productCreateBody = {
    shopping_mall_seller_id: sellerLoggedIn.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.example.com/product/" + RandomGenerator.alphaNumeric(8),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  TestValidator.equals(
    "product code should match requested code",
    product.code,
    productCode,
  );

  // 6. Create a product option type (e.g., Color)
  const optionTypeCreateBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: optionTypeCreateBody,
      },
    );
  typia.assert(optionType);

  // 7. Create two option values (e.g., red and blue) under this option type
  const redOptionCreateBody = {
    value: "red",
    display_name: "Red",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const redOption: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: redOptionCreateBody,
      },
    );
  typia.assert(redOption);

  const blueOptionCreateBody = {
    value: "blue",
    display_name: "Blue",
    display_order: 1 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const blueOption: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: blueOptionCreateBody,
      },
    );
  typia.assert(blueOption);

  // 8. Create a SKU under this product
  const skuCode = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  const skuCreateBody = {
    code: skuCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice: 10000,
    salePrice: 9000,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuCreateBody,
    });
  typia.assert(sku);

  TestValidator.equals(
    "sku code should match requested code",
    sku.code,
    skuCode,
  );

  // 9. Create SKU option value assignments for red and blue
  const redAssignmentCreateBody = {
    productOptionTypeCode: optionTypeCreateBody.name,
    productOptionValueCode: redOptionCreateBody.value,
    orderIndex: 0 as number & tags.Type<"int32">,
  } satisfies IShoppingMallSkuOptionValueAssignment.ICreate;

  const redAssignment: IShoppingMallSkuOptionValueAssignment =
    await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.create(
      connection,
      {
        productCode: product.code,
        skuCode: sku.code,
        body: redAssignmentCreateBody,
      },
    );
  typia.assert(redAssignment);

  const blueAssignmentCreateBody = {
    productOptionTypeCode: optionTypeCreateBody.name,
    productOptionValueCode: blueOptionCreateBody.value,
    orderIndex: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallSkuOptionValueAssignment.ICreate;

  const blueAssignment: IShoppingMallSkuOptionValueAssignment =
    await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.create(
      connection,
      {
        productCode: product.code,
        skuCode: sku.code,
        body: blueAssignmentCreateBody,
      },
    );
  typia.assert(blueAssignment);

  // 10. List assignments via PATCH index with minimal request body
  const listRequestBody =
    {} satisfies IShoppingMallSkuOptionValueAssignment.IRequest;

  const page: IPageIShoppingMallSkuOptionValueAssignment.ISummary =
    await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.index(
      connection,
      {
        productCode: product.code,
        skuCode: sku.code,
        body: listRequestBody,
      },
    );
  typia.assert(page);

  TestValidator.predicate(
    "at least one assignment should be returned",
    page.pagination.records > 0 && page.data.length > 0,
  );

  // Find the red assignment in the listed data
  const redSummary = page.data.find((it) => it.id === redAssignment.id);

  TestValidator.predicate(
    "listed assignments should include the red assignment",
    !!redSummary,
  );

  if (!redSummary) return;

  // Validate linkage and display fields for the red assignment
  TestValidator.equals(
    "red summary sku code matches sku code",
    redSummary.sku.code,
    sku.code,
  );

  TestValidator.equals(
    "red summary option value matches created red option",
    redSummary.option_value.value,
    redOption.value,
  );

  TestValidator.predicate(
    "red summary display_name should be non-empty",
    redSummary.display_name.length > 0,
  );

  // Ensure all returned entries belong to the same skuCode
  for (const summary of page.data) {
    TestValidator.equals(
      "all summaries should belong to the same sku",
      summary.sku.code,
      sku.code,
    );
  }
}
