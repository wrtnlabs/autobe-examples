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
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate platform-admin SKU deletion behavior when the target SKU does not
 * exist.
 *
 * Business goal:
 *
 * - Ensure that DELETE
 *   /shoppingMall/platformAdmin/products/{productCode}/skus/{skuCode} behaves
 *   safely when the specified skuCode does not exist for the given product.
 * - The operation must fail with an error, and no unintended side effects should
 *   occur on the product itself.
 *
 * High-level workflow:
 *
 * 1. Register a platform admin and obtain an authenticated admin session.
 * 2. As the admin, create a brand that will later be associated with a product.
 * 3. Register a seller and obtain an authenticated seller session.
 * 4. As the seller, create a multi-SKU-enabled product using the created brand.
 * 5. Construct a clearly non-existent skuCode string for this product.
 * 6. Log back in as the platform admin.
 * 7. Call the SKU erase endpoint with the valid productCode and non-existent
 *    skuCode.
 * 8. Assert that the erase call fails (throws) using TestValidator.error.
 */
export async function test_api_platform_admin_sku_delete_for_nonexistent_sku(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (join) and obtain authorized session
  const platformAdminEmail = typia.random<string & tags.Format<"email">>();
  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(1),
    password: "AdminPassw0rd!",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorizedFromJoin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorizedFromJoin);

  // 2. As the platform admin, create a brand for realistic product association
  const brandCreateBody = {
    name: RandomGenerator.name(1),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Register a seller (join) and get seller session
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "SellerPassw0rd!",
    storeName: RandomGenerator.name(1),
    contactPhone: undefined,
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorizedFromJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorizedFromJoin);

  // 4. As the seller, create a multi-SKU-enabled product using the created brand
  const productCode = RandomGenerator.alphaNumeric(16);
  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorizedFromJoin.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(3),
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

  // Sanity check: ensure product.code is what we expect (business identifier)
  TestValidator.equals(
    "product business code should match creation code",
    product.code,
    productCode,
  );

  // 5. Construct a clearly non-existent skuCode string
  const nonExistentSkuCode = `nonexistent-sku-${RandomGenerator.alphaNumeric(12)}`;

  // 6. Log back in as platform admin to ensure admin context for deletion
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: "AdminPassw0rd!",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminAuthorizedFromLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAuthorizedFromLogin);

  // 7 & 8. Attempt to delete a non-existent SKU and assert it fails
  await TestValidator.error(
    "deleting non-existent SKU as platform admin should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.products.skus.erase(
        connection,
        {
          productCode: product.code,
          skuCode: nonExistentSkuCode,
        },
      );
    },
  );
}
