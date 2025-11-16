import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";

/**
 * Validate that creating two products with the same business-visible code for
 * the same seller is rejected by the unique constraint.
 *
 * Business context:
 *
 * - Shopping_mall_products.code is globally unique and used as the
 *   business-visible product identifier.
 * - The seller-scoped endpoint /shoppingMall/seller/products should still enforce
 *   this uniqueness; a seller must not be able to register two products with
 *   the same code.
 *
 * Steps:
 *
 * 1. Join as a new seller using /auth/seller/join, which returns
 *    IShoppingMallSeller.IAuthorized and configures the connection for
 *    authenticated seller calls.
 * 2. Create a first product via /shoppingMall/seller/products with
 *    IShoppingMallProduct.ICreate, using a fixed code like "SKU-UNIQUE-001",
 *    status="active", is_multi_sku=false, and shopping_mall_seller_id set to
 *    the authenticated seller.seller.id.
 * 3. Assert that creation succeeded, and verify via typia.assert and
 *    TestValidator.equals that:
 *
 *    - The returned product.code equals the requested code.
 *    - The returned product.seller.id equals the authenticated seller summary id.
 * 4. Attempt to create a second product via the same endpoint using the same code
 *    and shopping_mall_seller_id, but with different name and descriptions to
 *    show the collision is purely code-based.
 * 5. Use TestValidator.error to assert that the second creation fails, without
 *    checking specific HTTP status codes or error bodies.
 * 6. Rely on backend guarantees that no second product row is created when the
 *    unique constraint is violated; since we have no listing endpoint available
 *    in this test, we limit our validation to the error behavior and confirmed
 *    success of the first creation.
 */
export async function test_api_seller_product_creation_duplicate_code_rejected(
  connection: api.IConnection,
) {
  // 1. Join as a new seller
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    storeName: RandomGenerator.name(),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const authorizedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(authorizedSeller);

  const sellerId = authorizedSeller.seller.id;

  // 2. Create first product with a fixed unique code
  const productCode = "SKU-UNIQUE-001";

  const firstProductBody = {
    shopping_mall_seller_id: sellerId,
    // no brand association for simplicity
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    short_description: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const firstProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: firstProductBody,
    });
  typia.assert<IShoppingMallProduct>(firstProduct);

  // 3. Validate that the created product matches expectations
  TestValidator.equals(
    "first product code matches requested code",
    firstProduct.code,
    productCode,
  );
  TestValidator.equals(
    "first product seller id matches authorized seller",
    firstProduct.seller.id,
    sellerId,
  );

  // 4. Attempt to create a second product with the same code for the same seller
  const secondProductBody = {
    shopping_mall_seller_id: sellerId,
    // still no brand association
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 4 }),
    short_description: RandomGenerator.paragraph({ sentences: 6 }),
    description: RandomGenerator.content({ paragraphs: 3 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  await TestValidator.error(
    "second product creation with duplicate code must fail",
    async () => {
      await api.functional.shoppingMall.seller.products.create(connection, {
        body: secondProductBody,
      });
    },
  );
}
