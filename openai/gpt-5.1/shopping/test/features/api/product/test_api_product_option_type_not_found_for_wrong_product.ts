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
 * Verify option type scoping to owning product using mismatched productCode/id.
 *
 * Business context: Product option types (like Color, Size) are stored in
 * `shopping_mall_product_option_types` and are associated with a parent
 * product. The public GET endpoint
 * `/shoppingMall/products/{productCode}/optionTypes/{productOptionTypeId}` must
 * ensure that a caller cannot retrieve an option type that belongs to Product A
 * by pairing its id with Product B’s productCode. Doing so should behave as a
 * not-found scenario, preventing accidental or malicious data leakage across
 * products.
 *
 * Test flow:
 *
 * 1. Register and log in a platform admin, then create a brand.
 * 2. Register and log in a seller.
 * 3. As the seller, create two distinct products (Product A and Product B), both
 *    associated with the created brand, but with different `code` values.
 * 4. As the seller, create a single product option type under Product A only.
 * 5. Call GET
 *    /shoppingMall/products/{productCode}/optionTypes/{productOptionTypeId}
 *    with Product B’s `code` and the option type id from Product A.
 *
 *    - Expect an HttpError with a 4xx status (client error / not-found style).
 * 6. Call the same GET endpoint with Product A’s `code` and the same id.
 *
 *    - Expect success and a valid IShoppingMallProductOptionType.
 * 7. Assert that returned id matches the created option type, proving the scoping
 *    is correctly enforced by (productCode, productOptionTypeId).
 */
export async function test_api_product_option_type_not_found_for_wrong_product(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (join) and keep the authorized session
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: "AdminPass!234",
    // Use dummy but valid URIs for href and referrer
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Explicit login to simulate normal flow (even though join already logs in)
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 2. As platform admin, create a brand
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: "https://cdn.example.com/brand/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 3. Register and log in a seller
  const sellerJoinBody = {
    email: `seller+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "SellerPass!234",
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 4. Create Product A and Product B as this seller
  const sellerId = sellerAuthorized.id;
  const brandId = brand.id;

  const productACode = `PROD-A-${RandomGenerator.alphaNumeric(8)}`;
  const productARequest = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brandId,
    code: productACode,
    name: `Product A ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/products/a.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productARequest,
    });
  typia.assert(productA);

  const productBCode = `PROD-B-${RandomGenerator.alphaNumeric(8)}`;
  const productBRequest = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brandId,
    code: productBCode,
    name: `Product B ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/products/b.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBRequest,
    });
  typia.assert(productB);

  // 5. Create a product option type under Product A only
  const optionTypeCreateBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionTypeA: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: productA.code,
        body: optionTypeCreateBody,
      },
    );
  typia.assert(optionTypeA);

  // 6. Attempt to read the option type via Product B’s code (mismatched pair)
  //    Expect some 4xx HttpError, using httpError to avoid type error tests.
  await TestValidator.httpError(
    "mismatched productCode and optionTypeId must result in client error",
    [400, 404, 409, 422, 403],
    async () => {
      await api.functional.shoppingMall.products.optionTypes.at(connection, {
        productCode: productB.code,
        productOptionTypeId: optionTypeA.id,
      });
    },
  );

  // 7. Verify that the correct combination (Product A + optionTypeA.id) works
  const fetchedOptionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.products.optionTypes.at(connection, {
      productCode: productA.code,
      productOptionTypeId: optionTypeA.id,
    });
  typia.assert(fetchedOptionType);

  TestValidator.equals(
    "fetched option type id must match created option type id",
    fetchedOptionType.id,
    optionTypeA.id,
  );

  TestValidator.equals(
    "fetched option type display_order must match created value",
    fetchedOptionType.display_order,
    optionTypeA.display_order,
  );
}
