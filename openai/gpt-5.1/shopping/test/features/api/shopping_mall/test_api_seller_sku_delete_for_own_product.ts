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
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Verify that an authenticated seller can delete a SKU belonging to one of
 * their own products.
 *
 * Business flow:
 *
 * 1. Join as platform admin and create a brand.
 * 2. Join as seller and create a multi-SKU product associated with that brand.
 * 3. Under the same seller, create a concrete active, purchasable SKU for the
 *    product.
 * 4. Call the erase API to delete that SKU.
 * 5. Validate basic relationships (seller owns product, product is_multi_sku is
 *    true, etc.).
 *
 * Note: public SKU detail/listing APIs are not available in the provided SDK,
 * so we cannot re-fetch SKUs to prove their absence after deletion. Success is
 * validated by the absence of errors and type-checked responses on all non-void
 * operations.
 */
export async function test_api_seller_sku_delete_for_own_product(
  connection: api.IConnection,
) {
  // 1. Join as platform admin
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.example.com/join",
    referrer: "https://admin.shoppingmall.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a brand as platform admin
  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri:
      "https://cdn.example.com/logo/" + RandomGenerator.alphaNumeric(12),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Join as seller (this call also sets Authorization header for seller actor)
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

  // 4. Create a multi-SKU product owned by the seller and associated with the brand
  const productCode: string & tags.MinLength<1> =
    `PRD-${RandomGenerator.alphaNumeric(10)}` satisfies string as string;

  const productCreateBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.example.com/product/" + RandomGenerator.alphaNumeric(16),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // Basic relational validations
  TestValidator.equals(
    "product seller id should match authenticated seller",
    product.seller.id,
    seller.id,
  );
  if (product.brand !== undefined && product.brand !== null) {
    TestValidator.equals(
      "product brand id should match created brand",
      product.brand.id,
      brand.id,
    );
  }
  TestValidator.predicate(
    "product should be configured as multi SKU",
    product.is_multi_sku === true,
  );

  // 5. Create a concrete active, purchasable SKU under the product
  const skuCode = `SKU-${RandomGenerator.alphaNumeric(10)}`;

  const skuCreateBody = {
    code: skuCode,
    name: `${product.name} Variant`,
    listPrice: 10000,
    salePrice: 8000,
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
    "SKU productCode should match product.code",
    sku.productCode,
    product.code,
  );
  TestValidator.equals(
    "SKU code should match requested skuCode",
    sku.code,
    skuCode,
  );
  TestValidator.predicate(
    "SKU should be active and purchasable",
    sku.isActive === true && sku.isPurchasable === true,
  );

  // 6. Delete the SKU as the owning seller
  await api.functional.shoppingMall.seller.products.skus.erase(connection, {
    productCode: product.code,
    skuCode: sku.code,
  });

  // No further visibility APIs are available to prove absence; reaching this point
  // without HttpError is treated as success for the deletion operation.
}
