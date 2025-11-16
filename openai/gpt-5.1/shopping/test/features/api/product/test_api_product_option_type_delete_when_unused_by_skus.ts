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
 * Ensure that a seller can safely delete an unused product option type.
 *
 * Business context
 *
 * - A platform admin manages brands globally.
 * - Sellers own products and their option types.
 * - A product configured as multi-SKU may have option types, option values, and
 *   SKUs.
 * - For an option type that has no dependent option values or SKUs, the delete
 *   API must allow the seller to remove it without referential integrity
 *   errors.
 *
 * This scenario covers the simplest happy path where the option type is unused.
 *
 * Steps
 *
 * 1. Register a platform admin (join) so that we can create a brand.
 * 2. As the platform admin, create a brand.
 * 3. Register a seller (join) so the seller can create products and option types.
 * 4. As the seller, create a multi-SKU product associated with the brand.
 * 5. Under that product, create a product option type with display_order = 0.
 * 6. Call the erase endpoint to delete that option type as the same seller.
 * 7. Assert that all non-void responses match their DTOs and that no error is
 *    thrown when deleting the unused option type.
 */
export async function test_api_product_option_type_delete_when_unused_by_skus(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (authenticate as platform admin)
  const platformAdminJoinBody =
    typia.random<IShoppingMallPlatformAdminJoin.IRequest>();
  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a brand as platform admin
  const brandCreateBody = typia.random<IShoppingMallBrand.ICreate>();
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Seller joins (authenticate as seller, connection becomes seller context)
  const sellerJoinBody = typia.random<IShoppingMallSellerJoin.IRequest>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  // 4. Create a multi-SKU product owned by this seller and associated with the brand.
  //    We construct the product ICreate body explicitly so we can control
  //    seller id, brand id, and is_multi_sku flag.
  const productCreateBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: brand.id,
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // Basic business assertions on the created product
  TestValidator.equals("product is multi-sku", product.is_multi_sku, true);
  if (product.brand !== null && product.brand !== undefined) {
    TestValidator.equals(
      "product brand id matches created brand",
      product.brand.id,
      brand.id,
    );
  }

  // 5. Create an option type under that product with display_order = 0
  const optionTypeCreateBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0,
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

  // 6. Delete the unused option type as the same seller.
  //    erase returns void; success is indicated by lack of thrown error.
  await api.functional.shoppingMall.seller.products.optionTypes.erase(
    connection,
    {
      productCode: product.code,
      productOptionTypeId: optionType.id,
    },
  );

  // 7. If we reached here, deletion succeeded without referential integrity
  //    errors for an unused option type.
  TestValidator.predicate("erase of unused option type completed", true);
}
