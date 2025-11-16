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

/**
 * Validate that deleting one product option type on a multi-SKU product does
 * not prevent managing other option types or the product itself.
 *
 * Business flow covered by this test:
 *
 * 1. Platform admin joins and becomes authenticated.
 * 2. Platform admin creates a brand.
 * 3. Seller joins and becomes authenticated.
 * 4. Seller creates a multi-SKU-capable product attached to the brand.
 * 5. Seller registers two option types (e.g., Color and Size) for that product.
 * 6. Seller deletes one of the option types using the erase endpoint.
 * 7. Seller successfully creates another option type on the same product after the
 *    deletion, proving the product configuration is still valid and other
 *    option types are not impacted.
 *
 * Due to missing list/read endpoints for option types, post-delete verification
 * is indirect: we assert that erase does not throw and that a subsequent
 * optionTypes.create call on the same product code succeeds.
 */
export async function test_api_product_option_type_delete_while_other_option_types_exist(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (authentication context for brand creation)
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Platform admin creates a brand
  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.shoppingmall.test/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Seller joins and becomes authenticated
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

  // 4. Seller creates a multi-SKU product associated with the created brand
  const productCode: string & tags.MinLength<1> =
    `PROD-${RandomGenerator.alphaNumeric(10)}` as string & tags.MinLength<1>;

  const productCreateBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.shoppingmall.test/product-primary.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  TestValidator.equals(
    "created product code should equal requested code",
    product.code,
    productCode,
  );

  // 5. Seller registers two option types for this product
  const colorOptionBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const sizeOptionBody = {
    name: "Size",
    display_name: "Size",
    display_order: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const colorOption: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: colorOptionBody,
      },
    );
  typia.assert(colorOption);

  const sizeOption: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: sizeOptionBody,
      },
    );
  typia.assert(sizeOption);

  TestValidator.equals(
    "color option name should match request",
    colorOption.name,
    colorOptionBody.name,
  );
  TestValidator.equals(
    "size option name should match request",
    sizeOption.name,
    sizeOptionBody.name,
  );

  // 6. Delete one of the option types (e.g., Color)
  await api.functional.shoppingMall.seller.products.optionTypes.erase(
    connection,
    {
      productCode: product.code,
      productOptionTypeId: colorOption.id,
    },
  );

  // 7. Indirect verification: create another option type on the same product
  //    after deletion to ensure product and remaining options are still usable.
  const newColorOptionBody = {
    name: "Color",
    display_name: "Color",
    display_order: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const newColorOption: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: newColorOptionBody,
      },
    );
  typia.assert(newColorOption);

  TestValidator.equals(
    "new color option name should match request after deletion of previous color option",
    newColorOption.name,
    newColorOptionBody.name,
  );

  // Sanity check: original product structure is still valid (no type-level corruption)
  typia.assert<IShoppingMallProduct>(product);
}
