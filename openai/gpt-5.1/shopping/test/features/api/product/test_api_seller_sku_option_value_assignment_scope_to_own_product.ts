import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

/**
 * Ensure seller-scoped access control for SKU option value assignment detail.
 *
 * Business goals:
 *
 * - A seller (Seller A) who owns a product can create SKUs, option types, option
 *   values, and SKU option value assignments, and can successfully retrieve the
 *   assignment detail.
 * - Another seller (Seller B) must not be able to retrieve that assignment detail
 *   even if they somehow know productCode, skuCode, and assignment ID.
 *
 * Flow:
 *
 * 1. Join Seller A.
 * 2. Join Seller B.
 * 3. Join + login a platform admin, then create a brand (for realistic product
 *    setup).
 * 4. As Seller A, create Product A associated with that brand.
 * 5. As Seller A, create an option type for Product A.
 * 6. As Seller A, create an option value under that option type.
 * 7. As Seller A, create a SKU under Product A.
 * 8. As Seller A, create a SKU option value assignment for that SKU.
 * 9. As Seller A, GET the assignment detail and assert success + type correctness.
 * 10. Login as Seller B and attempt to GET the same assignment, expecting an HTTP
 *     error without asserting on the exact HTTP status code.
 */
export async function test_api_seller_sku_option_value_assignment_scope_to_own_product(
  connection: api.IConnection,
) {
  // 1. Register Seller A (auto-login via join)
  const sellerAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerAJoinBody = {
    email: sellerAEmail,
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerA: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinBody,
    });
  typia.assert(sellerA);

  // 2. Register Seller B (auto-login switches token to Seller B)
  const sellerBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerBJoinBody = {
    email: sellerBEmail,
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerB: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinBody,
    });
  typia.assert(sellerB);

  // 3. Join + login as platform admin, then create a brand
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(16),
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
    email: platformAdmin.email,
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

  // 4. Switch back to Seller A (login) to create Product A and related data
  const sellerALoginBody = {
    email: sellerAEmail,
    password: sellerAJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerALoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginBody,
    });
  typia.assert(sellerALoggedIn);

  // 5. Create Product A under Seller A
  const productCodeA: string & tags.MinLength<1> = RandomGenerator.alphaNumeric(
    10,
  ) as string & tags.MinLength<1>;

  const productACreateBody = {
    shopping_mall_seller_id: sellerALoggedIn.id,
    shopping_mall_brand_id: brand.id,
    code: productCodeA,
    name: RandomGenerator.name(3) as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.example.com/product/" + RandomGenerator.alphaNumeric(8),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productACreateBody,
    });
  typia.assert(productA);

  // 6. Create an option type for Product A
  const optionTypeCreateBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: productA.code,
        body: optionTypeCreateBody,
      },
    );
  typia.assert(optionType);

  // 7. Create an option value under that option type
  const optionValueCreateBody = {
    value: "RED",
    display_name: "Red",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: productA.code,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert(optionValue);

  // 8. Create a SKU for Product A
  const skuCodeA = RandomGenerator.alphaNumeric(10);
  const skuCreateBody = {
    code: skuCodeA,
    name: `${productA.name} - Red`,
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const skuA: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: productA.code,
      body: skuCreateBody,
    });
  typia.assert(skuA);

  // 9. Create a SKU option value assignment for the SKU
  const assignmentCreateBody = {
    productOptionTypeCode: optionType.name,
    productOptionValueCode: optionValue.value,
    orderIndex: 0 as number & tags.Type<"int32">,
  } satisfies IShoppingMallSkuOptionValueAssignment.ICreate;

  const assignment: IShoppingMallSkuOptionValueAssignment =
    await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.create(
      connection,
      {
        productCode: productA.code,
        skuCode: skuA.code,
        body: assignmentCreateBody,
      },
    );
  typia.assert(assignment);

  // 10. Positive path: Seller A can retrieve the assignment detail
  const fetchedAsSellerA: IShoppingMallSkuOptionValueAssignment =
    await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.at(
      connection,
      {
        productCode: productA.code,
        skuCode: skuA.code,
        skuOptionValueAssignmentId: assignment.id,
      },
    );
  typia.assert(fetchedAsSellerA);

  TestValidator.equals(
    "seller A should see the same assignment id",
    fetchedAsSellerA.id,
    assignment.id,
  );
  TestValidator.equals(
    "seller A should see matching product and sku codes",
    fetchedAsSellerA.productCode,
    productA.code,
  );
  TestValidator.equals(
    "seller A should see matching sku code",
    fetchedAsSellerA.skuCode,
    skuA.code,
  );

  // 11. Switch authentication to Seller B and attempt cross-seller access
  const sellerBLoginBody = {
    email: sellerBEmail,
    password: sellerBJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerBLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerBLoginBody,
    });
  typia.assert(sellerBLoggedIn);

  await TestValidator.error(
    "seller B must not be able to read seller A's SKU option value assignment",
    async () => {
      await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.at(
        connection,
        {
          productCode: productA.code,
          skuCode: skuA.code,
          skuOptionValueAssignmentId: assignment.id,
        },
      );
    },
  );
}
