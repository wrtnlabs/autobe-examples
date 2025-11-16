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
 * Validate that SKU detail retrieval returns not-found for a wrong skuCode.
 *
 * Business workflow:
 *
 * 1. Register a platform admin (auto-authenticated) via /auth/platformAdmin/join.
 * 2. As platform admin, create a brand via /shoppingMall/platformAdmin/brands.
 * 3. Register a seller (auto-authenticated) via /auth/seller/join, switching the
 *    connection context to the seller.
 * 4. As seller, create a product via /shoppingMall/seller/products, associated
 *    with the seller and the created brand, and configured as a multi-SKU
 *    product.
 * 5. As seller, create a single SKU for that product via
 *    /shoppingMall/seller/products/{productCode}/skus with a known skuCode.
 * 6. Call the public SKU detail endpoint GET
 *    /shoppingMall/products/{productCode}/skus/{skuCode} using the correct
 *    productCode but a deliberately wrong skuCode (derived from the real one).
 * 7. Assert that the call fails with HTTP 404 using TestValidator.httpError,
 *    without inspecting the error body, ensuring no internal identifiers are
 *    leaked by the test itself.
 */
export async function test_api_product_sku_detail_not_found_for_wrong_code(
  connection: api.IConnection,
) {
  // 1. Platform admin join (auto-login)
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: "Admin " + typia.random<string & tags.MinLength<1>>(),
    password: "admin-password",
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create brand as platform admin
  const brandCreateBody = {
    name: "Brand " + typia.random<string & tags.MinLength<1>>(),
    slug: "brand-" + typia.random<string & tags.MinLength<1>>(),
    description: undefined,
    logo_uri: undefined,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Seller join (auto-login switches context)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "seller-password",
    storeName: "Store " + typia.random<string & tags.MinLength<1>>(),
    contactPhone: undefined,
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  // 4. Create product as seller
  const productCreateBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: brand.id,
    code: typia.random<string & tags.MinLength<1>>(),
    name: "Product " + typia.random<string & tags.MinLength<1>>(),
    short_description: null,
    description: null,
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 5. Create a valid SKU under the product
  const skuCode = "SKU" + typia.random<string & tags.MinLength<1>>();
  const skuCreateBody = {
    code: skuCode,
    name: "SKU Name " + typia.random<string & tags.MinLength<1>>(),
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 6. Attempt to fetch SKU with non-existent skuCode
  const wrongSkuCode = `${sku.code}-wrong`;

  await TestValidator.httpError(
    "non-existent skuCode returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.products.skus.at(connection, {
        productCode: product.code,
        skuCode: wrongSkuCode,
      });
    },
  );
}
