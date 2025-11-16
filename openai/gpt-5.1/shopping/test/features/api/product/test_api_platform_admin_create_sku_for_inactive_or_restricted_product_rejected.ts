import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate SKU creation lifecycle restrictions for platform-admin-managed
 * products.
 *
 * Business goal: Ensure that even platform administrators cannot create SKU
 * variants for products whose lifecycle status is configured as non-active or
 * otherwise blocked (for example, an "inactive" catalog status). Conversely,
 * verify that SKU creation behaves normally when the product is in an allowed
 * lifecycle state.
 *
 * High-level flow:
 *
 * 1. Join as a platform admin using POST /auth/platformAdmin/join to obtain an
 *    authenticated admin context.
 * 2. Create a brand via POST /shoppingMall/platformAdmin/brands so that we
 *    exercise brand linkage when creating products.
 * 3. Create a first product via POST /shoppingMall/platformAdmin/products with:
 *
 *    - Some valid seller id (here we use typia.random to generate a UUID)
 *    - Brand id set to the created brand
 *    - Status set to a value representing a non-active or restricted state, e.g.
 *         "inactive" (any non-empty string is allowed by the DTO)
 *    - Is_multi_sku = true so SKU endpoints make sense business-wise
 * 4. Attempt to create a SKU under this first product using POST
 *    /shoppingMall/platformAdmin/products/{productCode}/skus with a fully valid
 *    IShoppingMallProductSku.ICreate payload (code, name, list/sale price,
 *    currency, flags). Wrap this call in TestValidator.error to assert that the
 *    operation fails for the inactive product. The test must not attempt to
 *    inspect HTTP status codes or error payload details; only the fact that an
 *    error is thrown matters.
 * 5. Create a second product that represents an active/allowed lifecycle:
 *
 *    - Status set to a different non-empty string such as "active"
 *    - Is_multi_sku = true
 * 6. Create a SKU under this second product with a similar, valid
 *    IShoppingMallProductSku.ICreate body and assert that it succeeds using
 *    typia.assert on the returned IShoppingMallProductSku. Optionally perform
 *    light business validations via TestValidator.equals/predicate (for
 *    instance, ensuring the returned productCode and SKU code match what was
 *    sent).
 *
 * Technical constraints:
 *
 * - Use only the imports provided by the template.
 * - Use typia.random with the proper generic arguments for any random values
 *   (email, uri, uuid, etc.).
 * - For request bodies, always use the `satisfies` keyword with the exact DTO
 *   type (IShoppingMallPlatformAdminJoin.IRequest, IShoppingMallBrand.ICreate,
 *   IShoppingMallProduct.ICreate, IShoppingMallProductSku.ICreate) and never
 *   rely on `as` type assertions.
 * - Always await API calls and call typia.assert on non-void responses.
 * - When testing the failing SKU creation, use `await TestValidator.error` with
 *   an async closure that awaits the SKU creation call.
 */
export async function test_api_platform_admin_create_sku_for_inactive_or_restricted_product_rejected(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin to obtain an authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a brand
  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.shoppingmall.test/brand-logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Create an inactive product where SKU creation should be rejected
  const inactiveProductCode: string & tags.MinLength<1> =
    RandomGenerator.alphaNumeric(10);
  const inactiveProductBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_brand_id: brand.id,
    code: inactiveProductCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    short_description: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "inactive",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.shoppingmall.test/products/inactive.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const inactiveProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: inactiveProductBody,
      },
    );
  typia.assert(inactiveProduct);

  // 4. Attempt to create a SKU under the inactive product and expect failure
  const rejectedSkuBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  await TestValidator.error(
    "SKU creation must be rejected for inactive product",
    async () => {
      await api.functional.shoppingMall.platformAdmin.products.skus.create(
        connection,
        {
          productCode: inactiveProduct.code,
          body: rejectedSkuBody,
        },
      );
    },
  );

  // 5. Create an active product where SKU creation should succeed
  const activeProductCode: string & tags.MinLength<1> =
    RandomGenerator.alphaNumeric(10);
  const activeProductBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_brand_id: brand.id,
    code: activeProductCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    short_description: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.shoppingmall.test/products/active.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const activeProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: activeProductBody,
      },
    );
  typia.assert(activeProduct);

  // 6. Create a SKU successfully for the active product
  const acceptedSkuBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice: 15000,
    salePrice: 12000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const createdSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: activeProduct.code,
        body: acceptedSkuBody,
      },
    );
  typia.assert(createdSku);

  // Light business validations on the successful SKU
  TestValidator.equals(
    "created SKU must be tied to the active product code",
    createdSku.productCode,
    activeProduct.code,
  );
  TestValidator.equals(
    "created SKU code must match request body",
    createdSku.code,
    acceptedSkuBody.code,
  );
}
