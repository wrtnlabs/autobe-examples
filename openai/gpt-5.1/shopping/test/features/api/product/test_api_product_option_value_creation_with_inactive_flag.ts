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
 * Validate creation of an inactive product option value for a seller product.
 *
 * Business flow:
 *
 * 1. Platform admin joins and logs in to be able to create a brand.
 * 2. Platform admin creates a brand to be optionally associated with the product.
 * 3. Seller joins and logs in to manage catalog products.
 * 4. Seller creates a multi-SKU product associated with the created brand.
 * 5. Seller creates a product option type (e.g., "Color") for that product.
 * 6. Seller creates an option value under that option type with is_active=false
 *    (e.g., value="blue-hidden", display_name="Blue (hidden)",
 *    display_order=2).
 *
 * Validations:
 *
 * - All intermediate creations (admin, brand, seller, product, option type,
 *   option value) return correctly typed DTOs.
 * - The created option value has is_active === false.
 * - The created option value has a null/undefined deleted_at field, i.e., it is
 *   not soft-deleted on creation even though it is inactive.
 * - The option value is linked to the correct option type via optionType.id, and
 *   the optionType summary fields match the original option type definition
 *   (name, display_name, display_order).
 * - Display ordering is preserved: the display_order on the option value is the
 *   value we passed in the request.
 */
export async function test_api_product_option_value_creation_with_inactive_flag(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Platform admin creates a brand
  const brandCreateBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.example.com/logo/" + RandomGenerator.alphaNumeric(8),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Seller joins
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 4. Seller creates a multi-SKU product associated with the created brand
  const productCode: string & tags.MinLength<1> = ("P-" +
    RandomGenerator.alphaNumeric(10)) as string & tags.MinLength<1>;

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Product ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
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

  // Sanity check: product code matches our requested code
  TestValidator.equals(
    "product code should match requested code",
    product.code,
    productCode,
  );

  // 5. Seller creates a product option type
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

  // 6. Seller creates an inactive option value under that option type
  const optionValueCreateBody = {
    value: "blue-hidden",
    display_name: "Blue (hidden)",
    display_order: 2 as number & tags.Type<"int32">,
    is_active: false,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert(optionValue);

  // Validations on the created option value
  TestValidator.predicate(
    "option value is_active should be false",
    optionValue.is_active === false,
  );

  TestValidator.equals(
    "option value display_order should match request",
    optionValue.display_order,
    optionValueCreateBody.display_order,
  );

  // deleted_at should be null or undefined on creation
  TestValidator.predicate(
    "option value deleted_at should be null or undefined on creation",
    optionValue.deleted_at === null || optionValue.deleted_at === undefined,
  );

  // Relationship: optionType summary on value should point back to the created option type
  TestValidator.equals(
    "option value optionType.id should match created option type id",
    optionValue.optionType.id,
    optionType.id,
  );

  TestValidator.equals(
    "option value optionType.name should match created option type name",
    optionValue.optionType.name,
    optionType.name,
  );

  TestValidator.equals(
    "option value optionType.display_name should match created option type display_name",
    optionValue.optionType.display_name,
    optionType.display_name,
  );

  TestValidator.equals(
    "option value optionType.display_order should match created option type display_order",
    optionValue.optionType.display_order,
    optionType.display_order,
  );
}
