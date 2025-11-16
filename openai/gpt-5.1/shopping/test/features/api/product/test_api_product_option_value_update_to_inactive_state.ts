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
 * Validate that a seller can deactivate an existing product option value for
 * one of their products and that lifecycle-related fields reflect the change
 * correctly.
 *
 * Business flow:
 *
 * 1. Join as platform admin and implicitly authenticate.
 * 2. Create a brand as platform admin.
 * 3. Join as seller and implicitly authenticate.
 * 4. Create a multi-SKU product for that seller, associated with the brand.
 * 5. Create a product option type for that product.
 * 6. Create an active product option value under that option type.
 * 7. Update that option value, setting is_active to false and modifying some
 *    presentation fields.
 * 8. Verify that the updated value is inactive, not soft-deleted, and still
 *    structurally consistent with the created value while having an updated
 *    `updated_at` timestamp.
 */
export async function test_api_product_option_value_update_to_inactive_state(
  connection: api.IConnection,
) {
  // 1. Join as platform admin
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.example.com/join",
    referrer: "https://shoppingmall.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);
  typia.assert<IAuthorizationToken>(platformAdmin.token);

  // 2. Create a brand as platform admin
  const brandBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri:
      "https://cdn.shoppingmall.example.com/logos/" +
      RandomGenerator.alphaNumeric(8) +
      ".png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 3. Join as seller (this also authenticates seller)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  // 4. Create a multi-SKU product for the seller associated with the brand
  const productCode = "P-" + RandomGenerator.alphaNumeric(10);

  const productBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.shoppingmall.example.com/products/" +
      RandomGenerator.alphaNumeric(16) +
      ".jpg",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  TestValidator.equals(
    "created product code should match requested code",
    product.code,
    productCode,
  );

  // 5. Create a product option type for that product
  const optionTypeBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: optionTypeBody,
      },
    );
  typia.assert(optionType);

  // 6. Create an active product option value under that option type
  const optionValueCreateBody = {
    value: "red",
    display_name: "Red",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const createdOptionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert(createdOptionValue);

  TestValidator.equals(
    "created option value should be active",
    createdOptionValue.is_active,
    true,
  );

  // 7. Update that option value to inactive and adjust presentation fields
  const updatedDisplayName = "Red (inactive)";
  const updatedDisplayOrder = (createdOptionValue.display_order + 1) as number &
    tags.Type<"int32">;

  const optionValueUpdateBody = {
    display_name: updatedDisplayName,
    display_order: updatedDisplayOrder,
    is_active: false,
  } satisfies IShoppingMallProductOptionValue.IUpdate;

  const updatedOptionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.update(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        productOptionValueId: createdOptionValue.id,
        body: optionValueUpdateBody,
      },
    );
  typia.assert(updatedOptionValue);

  // 8. Validate lifecycle and structural consistency
  TestValidator.equals(
    "updated option value id should match original",
    updatedOptionValue.id,
    createdOptionValue.id,
  );

  TestValidator.equals(
    "updated option value should be inactive",
    updatedOptionValue.is_active,
    false,
  );

  TestValidator.equals(
    "option value's optionType id should remain unchanged",
    updatedOptionValue.optionType.id,
    createdOptionValue.optionType.id,
  );

  TestValidator.equals(
    "option value's raw value field should remain unchanged",
    updatedOptionValue.value,
    createdOptionValue.value,
  );

  TestValidator.predicate(
    "updated_at must change after deactivation",
    () => updatedOptionValue.updated_at !== createdOptionValue.updated_at,
  );

  TestValidator.equals(
    "deactivation should not soft-delete option value (deleted_at stays null/undefined)",
    updatedOptionValue.deleted_at ?? null,
    createdOptionValue.deleted_at ?? null,
  );
}
