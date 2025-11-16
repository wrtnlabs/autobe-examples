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
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate creation of a product option value on a new multi-SKU product.
 *
 * Business flow covered by this E2E:
 *
 * 1. Platform admin joins and logs in to obtain admin auth context.
 * 2. Platform admin creates a brand for more realistic catalog data.
 * 3. Seller joins and logs in to obtain seller auth context.
 * 4. Seller creates a new product with is_multi_sku=true and the created brand.
 * 5. Seller creates an option type (e.g., Color) for that product.
 * 6. Seller creates an option value (e.g., Blue) for that option type.
 *
 * The test validates:
 *
 * - All responses conform to their DTOs via typia.assert.
 * - Product wiring: seller summary and brand summary match the actors used.
 * - Option type wiring: values (name/display_name/display_order) echo the
 *   request.
 * - Option value wiring: value/display_name/display_order/is_active echo the
 *   request and optionType summary refers to the just-created option type.
 */
export async function test_api_product_option_value_creation_for_new_multi_sku_product(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminFromJoin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminFromJoin);

  // 2. Platform admin login (to ensure login works and refresh auth context)
  const platformAdminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminFromLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminFromLogin);

  // 3. Platform admin creates a brand
  const brandCreateBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://static.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  TestValidator.equals(
    "brand name should match input",
    brand.name,
    brandCreateBody.name,
  );
  TestValidator.equals(
    "brand slug should match input",
    brand.slug,
    brandCreateBody.slug,
  );

  // 4. Seller joins (registration implicitly authenticates seller)
  const sellerJoinBody = {
    email: `seller+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerFromJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerFromJoin);

  // 5. Seller login to verify credentials and ensure proper token setting
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerFromLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerFromLogin);

  TestValidator.equals(
    "seller id from login should match join",
    sellerFromLogin.id,
    sellerFromJoin.id,
  );

  // 6. Seller creates a new multi-SKU product associated with the brand
  const productCode: string = `P-${RandomGenerator.alphaNumeric(10)}`;

  const productCreateBody = {
    shopping_mall_seller_id: sellerFromLogin.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Product ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    status: "draft",
    is_multi_sku: true,
    primary_image_uri: "https://static.example.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // Validate product wiring
  TestValidator.equals(
    "product code should match input",
    product.code,
    productCode,
  );
  TestValidator.predicate(
    "product is_multi_sku should be true",
    product.is_multi_sku === true,
  );
  TestValidator.equals(
    "product seller summary id should match seller id",
    product.seller.id,
    sellerFromLogin.id,
  );
  TestValidator.equals(
    "product seller summary email should match seller email",
    product.seller.email,
    sellerFromLogin.email,
  );
  if (product.brand !== null && product.brand !== undefined) {
    TestValidator.equals(
      "product brand summary id should match created brand id",
      product.brand.id,
      brand.id,
    );
  }

  // 7. Seller creates an option type for the product
  const optionTypeCreateBody = {
    name: "color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode,
        body: optionTypeCreateBody,
      },
    );
  typia.assert(optionType);

  TestValidator.equals(
    "option type name should match input",
    optionType.name,
    optionTypeCreateBody.name,
  );
  TestValidator.equals(
    "option type display_name should match input",
    optionType.display_name ?? null,
    optionTypeCreateBody.display_name ?? null,
  );
  TestValidator.equals(
    "option type display_order should match input",
    optionType.display_order,
    optionTypeCreateBody.display_order,
  );

  // 8. Seller creates an option value for the option type
  const optionValueCreateBody = {
    value: "blue",
    display_name: "Blue",
    display_order: 1 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert(optionValue);

  // Validate option value fields
  TestValidator.equals(
    "option value value should match input",
    optionValue.value,
    optionValueCreateBody.value,
  );
  TestValidator.equals(
    "option value display_name should match input",
    optionValue.display_name ?? null,
    optionValueCreateBody.display_name ?? null,
  );
  TestValidator.equals(
    "option value display_order should match input",
    optionValue.display_order,
    optionValueCreateBody.display_order,
  );
  TestValidator.predicate(
    "option value is_active should be true",
    optionValue.is_active === true,
  );

  // Validate wiring to optionType summary
  TestValidator.equals(
    "option value optionType.id should match created optionType id",
    optionValue.optionType.id,
    optionType.id,
  );
  TestValidator.equals(
    "option value optionType.name should match created optionType name",
    optionValue.optionType.name,
    optionType.name,
  );
  TestValidator.equals(
    "option value optionType.display_name should match created optionType display_name",
    optionValue.optionType.display_name ?? null,
    (optionType.display_name ?? null) as string | null,
  );
  TestValidator.equals(
    "option value optionType.display_order should match created optionType display_order",
    optionValue.optionType.display_order,
    optionType.display_order,
  );
}
