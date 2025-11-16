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
 * Validate platformAdmin-only permission for deleting SKUs via admin namespace.
 *
 * Business context:
 *
 * - SKUs are catalog variants under products created by sellers.
 * - Platform admins have elevated privileges and own the admin namespace
 *   endpoints under /shoppingMall/platformAdmin/...
 * - Sellers should not be able to perform admin-enforcement operations such as
 *   SKU deletion via the platform admin namespace.
 *
 * Scenario steps:
 *
 * 1. Register a seller via /auth/seller/join and capture the resulting seller
 *    session data.
 * 2. Register a platform admin via /auth/platformAdmin/join and capture their
 *    session data.
 * 3. As the seller (current connection implicitly authenticated as seller):
 *
 *    - Create a multi-SKU product using /shoppingMall/seller/products with
 *         is_multi_sku = true.
 *    - Capture the returned IShoppingMallProduct and its business-visible product
 *         code.
 * 4. As the platform admin:
 *
 *    - Login with /auth/platformAdmin/login to ensure the connection is
 *         authenticated as admin.
 *    - Create an SKU under the seller product via
 *         /shoppingMall/platformAdmin/products/{productCode}/skus using
 *         IShoppingMallProductSku.ICreate, and capture its skuCode.
 * 5. Negative path (seller must be forbidden on admin SKU delete endpoint):
 *
 *    - Login again as the seller via /auth/seller/login so that the connection is
 *         authenticated as seller.
 *    - Attempt to delete the SKU using DELETE
 *         /shoppingMall/platformAdmin/products/{productCode}/skus/{skuCode} via
 *         api.functional.shoppingMall.platformAdmin.products.skus.erase.
 *    - Wrap this call in TestValidator.error("seller cannot delete SKU via
 *         platformAdmin endpoint", async () => ...) to assert that it fails.
 * 6. Positive path (platform admin can delete SKU):
 *
 *    - Login as the platform admin again using /auth/platformAdmin/login.
 *    - Call api.functional.shoppingMall.platformAdmin.products.skus.erase with the
 *         same productCode and skuCode, and assert that it completes without
 *         throwing.
 *
 * Type and validation strategy:
 *
 * - Use IShoppingMallSellerJoin.IRequest and IShoppingMallSellerLogin.IRequest
 *   for seller join/login request bodies.
 * - Use IShoppingMallPlatformAdminJoin.IRequest and
 *   IShoppingMallPlatformAdminLogin.IRequest for platform admin join/login
 *   request bodies.
 * - Use IShoppingMallProduct.ICreate for creating the product.
 * - Use IShoppingMallProductSku.ICreate for creating the SKU.
 * - For all non-void API responses (join/login/product/sku creation), call
 *   typia.assert to validate their runtime shapes against the DTO types.
 * - Use RandomGenerator and typia.random with appropriate tags (e.g.
 *   Format<"email">, Format<"uri">) to create realistic data that satisfies DTO
 *   constraints.
 * - Never manipulate connection.headers manually; authentication tokens are
 *   managed by the SDK join/login functions.
 */
export async function test_api_platform_admin_sku_delete_vs_seller_permissions(
  connection: api.IConnection,
) {
  // 1. Register a seller
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword: string = RandomGenerator.alphaNumeric(12);

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 2. Register a platform admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);

  const platformAdminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(2),
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 3. As seller: create multi-SKU product
  const productCode: string = RandomGenerator.alphaNumeric(12);

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: undefined,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const createdProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(createdProduct);

  // 4. As platform admin: create SKU under that product
  const skuCode: string = RandomGenerator.alphaNumeric(10);

  const skuCreateBody = {
    code: skuCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const createdSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: createdProduct.code,
        body: skuCreateBody,
      },
    );
  typia.assert(createdSku);

  // Ensure codes align with what we expect
  TestValidator.equals(
    "created SKU code matches request",
    createdSku.code,
    skuCode,
  );
  TestValidator.equals(
    "created product code matches request",
    createdProduct.code,
    productCode,
  );

  // 5. Negative path: seller must not be able to delete via admin endpoint
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoginResult: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginResult);

  await TestValidator.error(
    "seller cannot delete SKU via platformAdmin endpoint",
    async () => {
      await api.functional.shoppingMall.platformAdmin.products.skus.erase(
        connection,
        {
          productCode: createdProduct.code,
          skuCode: createdSku.code,
        },
      );
    },
  );

  // 6. Positive path: platform admin can delete SKU
  const platformAdminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoginResult: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginResult);

  // This call should succeed without throwing
  await api.functional.shoppingMall.platformAdmin.products.skus.erase(
    connection,
    {
      productCode: createdProduct.code,
      skuCode: createdSku.code,
    },
  );
}
