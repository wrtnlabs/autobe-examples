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
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

export async function test_api_product_option_type_update_partial_fields(
  connection: api.IConnection,
) {
  // 1. Join platform admin
  const platformAdminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.test.com`,
    name: RandomGenerator.name(),
    password: "password-Admin1",
    ip: "127.0.0.1",
    href: "https://admin.shopping-mall.test/join",
    referrer: "https://admin.shopping-mall.test/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin creates a brand
  const brandCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: "https://cdn.shopping-mall.test/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Join seller (this also authenticates as seller via SDK header management)
  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller.test.com`,
    password: "password-Seller1",
    storeName: RandomGenerator.paragraph({ sentences: 2 }),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 4. Create a product as seller
  const productCode = RandomGenerator.alphaNumeric(12);

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.shopping-mall.test/product.png",
    additional_data: JSON.stringify({ fromTest: true }),
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  TestValidator.equals(
    "product code should match input code",
    product.code,
    productCode,
  );

  // 5. Create an option type for the product
  const optionTypeCreateBody = {
    name: "Size",
    display_name: "Size",
    display_order: 1,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const createdOptionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: optionTypeCreateBody,
      },
    );
  typia.assert(createdOptionType);

  // Capture original state
  const originalName: string = createdOptionType.name;
  const originalDisplayName: string | null | undefined =
    createdOptionType.display_name;
  const originalDisplayOrder = createdOptionType.display_order;
  const originalCreatedAt = createdOptionType.created_at;
  const originalUpdatedAt = createdOptionType.updated_at;

  // Preconditions
  TestValidator.equals(
    "created option type name should match input name",
    createdOptionType.name,
    optionTypeCreateBody.name,
  );
  TestValidator.equals(
    "created option type display_name should match input display_name",
    createdOptionType.display_name,
    optionTypeCreateBody.display_name,
  );
  TestValidator.equals(
    "created option type display_order should match input display_order",
    createdOptionType.display_order,
    optionTypeCreateBody.display_order,
  );

  // 6. Partial update: change only display_name
  const updatedDisplayName = "US Size";
  const optionTypeUpdateBody = {
    display_name: updatedDisplayName,
  } satisfies IShoppingMallProductOptionType.IUpdate;

  const updatedOptionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.update(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: createdOptionType.id,
        body: optionTypeUpdateBody,
      },
    );
  typia.assert(updatedOptionType);

  // 7. Validate partial update semantics
  TestValidator.equals(
    "updated display_name should reflect new value",
    updatedOptionType.display_name,
    updatedDisplayName,
  );
  TestValidator.equals(
    "name should remain unchanged after partial update",
    updatedOptionType.name,
    originalName,
  );
  TestValidator.equals(
    "display_order should remain unchanged after partial update",
    updatedOptionType.display_order,
    originalDisplayOrder,
  );

  // created_at must remain the same
  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedOptionType.created_at,
    originalCreatedAt,
  );

  // updated_at should change
  TestValidator.notEquals(
    "updated_at should be different after update",
    updatedOptionType.updated_at,
    originalUpdatedAt,
  );
}
