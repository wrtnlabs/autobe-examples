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
import type { IShoppingMallProductComplianceFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductComplianceFlag";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallProductVisibilityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVisibilityRule";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate that public SKU detail does not expose variants hidden by
 * visibility/compliance rules.
 *
 * ## Business goal
 *
 * A SKU can remain in the catalog (created and owned by a seller) but be hidden
 * or made non-purchasable for public shoppers through visibility rules or
 * compliance flags. Even when a shopper knows the exact productCode and
 * skuCode, the public GET /shoppingMall/products/{productCode}/skus/{skuCode}
 * endpoint must not return these hidden variants to an unauthenticated caller.
 *
 * This test focuses on the negative/public behavior: after creating such a SKU
 * and applying a hiding rule, an anonymous connection should no longer be able
 * to retrieve the SKU, and the SDK should surface this as an HttpError.
 *
 * ## High level steps
 *
 * 1. Register and authenticate a platform admin.
 * 2. As platform admin, create a brand.
 * 3. Register and authenticate a seller.
 * 4. As seller, create a product associated to the seller and brand.
 * 5. As seller, create an active, purchasable SKU under that product.
 * 6. As platform admin, create a visibility rule for that product that effectively
 *    hides it from the default web channel (or globally) and optionally attach
 *    a blocking compliance flag.
 * 7. Using the same connection (with Authorization header), call GET
 *    /shoppingMall/products/{productCode}/skus/{skuCode} to ensure the SKU
 *    exists and can be loaded in a trusted/admin context.
 * 8. Create a separate unauthenticated connection (headers: {}) and call the same
 *    GET endpoint with the same productCode and skuCode.
 * 9. Wrap the unauthenticated GET call in TestValidator.error and assert that an
 *    error is thrown, demonstrating that a public shopper cannot see the hidden
 *    SKU.
 */
export async function test_api_product_sku_detail_respects_visibility_rules(
  connection: api.IConnection,
) {
  // 1. Register platform admin and obtain authorized session
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a brand as platform admin
  const brandCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: undefined,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Register seller and obtain seller session
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.paragraph({ sentences: 2 }),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 4. Create a product as the seller, associated with the brand
  const productCode: string & tags.MinLength<1> = RandomGenerator.alphaNumeric(
    16,
  ) as string & tags.MinLength<1>;

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
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

  // 5. Create a SKU under that product as seller
  const skuCode = RandomGenerator.alphaNumeric(10);

  const skuCreateBody = {
    code: skuCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice: 19900,
    salePrice: 14900,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode,
      body: skuCreateBody,
    });
  typia.assert(sku);

  TestValidator.equals(
    "sku code should match requested code",
    sku.code,
    skuCode,
  );
  TestValidator.equals(
    "sku productCode should match product code",
    sku.productCode,
    productCode,
  );

  // 6. Apply visibility rule as platform admin to hide the product (and thus its SKUs)
  // Use visibility = "hidden" on channel "web" without region scoping.
  const visibilityRuleCreateBody = {
    shopping_mall_region_setting_id: null,
    channel: "web",
    visibility: "hidden",
    starts_at: null,
    ends_at: null,
  } satisfies IShoppingMallProductVisibilityRule.ICreate;

  const visibilityRule: IShoppingMallProductVisibilityRule =
    await api.functional.shoppingMall.platformAdmin.products.visibilityRules.create(
      connection,
      {
        productCode,
        body: visibilityRuleCreateBody,
      },
    );
  typia.assert(visibilityRule);

  TestValidator.equals(
    "visibility rule product id must match product.id",
    visibilityRule.shopping_mall_product_id,
    product.id,
  );

  // 6b. Optionally create a compliance flag marking the product as blocking sale
  const complianceFlagCreateBody = {
    shopping_mall_age_restriction_policy_id: null,
    flag_type: "age_restriction",
    flag_value: "19+",
    is_blocking_sale: true,
    notes: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallProductComplianceFlag.ICreate;

  const complianceFlag: IShoppingMallProductComplianceFlag =
    await api.functional.shoppingMall.platformAdmin.products.complianceFlags.create(
      connection,
      {
        productCode,
        body: complianceFlagCreateBody,
      },
    );
  typia.assert(complianceFlag);

  TestValidator.equals(
    "compliance flag product id must match product.id",
    complianceFlag.shopping_mall_product_id,
    product.id,
  );

  // 7. Sanity check: from an authenticated context, the SKU endpoint should be callable
  const visibleSkuForAdmin: IShoppingMallProductSku =
    await api.functional.shoppingMall.products.skus.at(connection, {
      productCode,
      skuCode,
    });
  typia.assert(visibleSkuForAdmin);
  TestValidator.equals(
    "admin-visible SKU id should match created SKU",
    visibleSkuForAdmin.id,
    sku.id,
  );

  // 8. Build unauthenticated connection to simulate public shopper
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 9. Assert that public shopper cannot retrieve the hidden SKU detail
  await TestValidator.error(
    "hidden SKU must not be visible to public shopper",
    async () => {
      await api.functional.shoppingMall.products.skus.at(anonymousConnection, {
        productCode,
        skuCode,
      });
    },
  );
}
