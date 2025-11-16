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
 * Validate visibility and consistency of product option types through the
 * public GET endpoint.
 *
 * Business context:
 *
 * - Sellers define option types ("Color", "Size", etc.) per product via
 *   seller-authenticated APIs.
 * - Shoppers or other public clients read these option types via GET
 *   /shoppingMall/products/{productCode}/optionTypes/{productOptionTypeId}.
 *
 * Because there is no direct soft-delete/update API for product option types in
 * the provided SDK, we cannot actually mark an option type as soft-deleted from
 * this test. Instead, this test focuses on a realistic, fully supported
 * workflow:
 *
 * 1. A platform admin joins and creates a brand.
 * 2. A seller joins and logs in.
 * 3. The seller creates a product using that brand.
 * 4. The seller defines an option type for that product.
 * 5. The test calls the public GET endpoint for that option type and verifies that
 *    the returned payload matches the created option type and is not
 *    soft-deleted (deleted_at is null/undefined).
 * 6. As a lightweight negative check, the test also attempts to load an option
 *    type using a random UUID that does not match the created option type and
 *    validates that an error is thrown (without asserting a specific HTTP
 *    status code), demonstrating that arbitrary IDs are not accepted as
 *    existing option types for the product.
 */
export async function test_api_product_option_type_visibility_after_soft_delete(
  connection: api.IConnection,
) {
  // 1. Platform admin joins to be able to create a brand later (auth side-effect only)
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create a brand as platform admin (requires admin auth already applied via join)
  const brandCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri:
      "https://cdn.shoppingmall.test/logos/" +
      RandomGenerator.alphaNumeric(12) +
      ".png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Seller joins and logs in
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

  // Explicit login step to reflect dependency list semantics
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.shoppingmall.test/login",
    referrer: "https://seller.shoppingmall.test/landing",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 4. Seller creates a product associated with the created brand
  const productCode: string & tags.MinLength<1> =
    `P-${RandomGenerator.alphaNumeric(10)}` as string & tags.MinLength<1>;

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    short_description: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.shoppingmall.test/products/" +
      RandomGenerator.alphaNumeric(16) +
      ".jpg",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  TestValidator.equals(
    "created product code must match input code",
    product.code,
    productCreateBody.code,
  );

  // 5. Seller creates a product option type for that product
  const optionTypeCreateBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
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

  // Sanity checks on created option type
  TestValidator.equals(
    "created option type name must match",
    createdOptionType.name,
    optionTypeCreateBody.name,
  );
  TestValidator.equals(
    "created option type display_name must match",
    createdOptionType.display_name ?? null,
    optionTypeCreateBody.display_name ?? null,
  );
  TestValidator.equals(
    "created option type display_order must match",
    createdOptionType.display_order,
    optionTypeCreateBody.display_order,
  );
  TestValidator.equals(
    "created option type should not be soft-deleted",
    createdOptionType.deleted_at ?? null,
    null,
  );

  // 6. Public GET: fetch option type through the products.optionTypes.at endpoint
  const fetchedOptionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.products.optionTypes.at(connection, {
      productCode: product.code,
      productOptionTypeId: createdOptionType.id,
    });
  typia.assert(fetchedOptionType);

  // 7. Validate consistency between seller-created and publicly-fetched option type
  TestValidator.equals(
    "public GET option type id must equal created id",
    fetchedOptionType.id,
    createdOptionType.id,
  );
  TestValidator.equals(
    "public GET option type name must match",
    fetchedOptionType.name,
    createdOptionType.name,
  );
  TestValidator.equals(
    "public GET option type display_name must match",
    fetchedOptionType.display_name ?? null,
    createdOptionType.display_name ?? null,
  );
  TestValidator.equals(
    "public GET option type display_order must match",
    fetchedOptionType.display_order,
    createdOptionType.display_order,
  );
  TestValidator.equals(
    "public GET option type should not be soft-deleted",
    fetchedOptionType.deleted_at ?? null,
    null,
  );

  // 8. Negative scenario: attempt to fetch an option type using a random UUID
  //    that is very unlikely to exist for this product and ensure an error is
  //    thrown. We do NOT assert HTTP status codes, only that the call fails.
  const unknownOptionTypeId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "public GET with unknown option type id should fail",
    async () => {
      await api.functional.shoppingMall.products.optionTypes.at(connection, {
        productCode: product.code,
        productOptionTypeId: unknownOptionTypeId,
      });
    },
  );
}
