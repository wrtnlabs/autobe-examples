import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate that product business code is unique per seller when creating
 * products.
 *
 * Business context:
 *
 * - Each seller manages products in `shopping_mall_products` identified by a
 *   business code.
 * - The pair (shopping_mall_seller_id, code) must be unique so sellers cannot
 *   register two different products with the same business code.
 * - Different sellers are allowed to reuse the same code independently.
 *
 * Scenario steps:
 *
 * 1. Seller A joins via POST /auth/seller/join and becomes authenticated on the
 *    shared connection.
 * 2. Seller A creates a product with code `SKU-UNIQ-001` via POST
 *    /shoppingMall/seller/products.
 * 3. Seller A attempts to create another product using the same code
 *    `SKU-UNIQ-001`.
 *
 *    - This should fail due to unique constraint on (sellerId, code).
 * 4. Seller B joins via POST /auth/seller/join and becomes the authenticated
 *    seller on the connection.
 * 5. Seller B creates a product with the same code `SKU-UNIQ-001` successfully,
 *    proving that uniqueness is scoped per seller.
 *
 * Validations:
 *
 * - All successful responses are asserted with typia.assert for full type
 *   validation.
 * - Business-level checks using TestValidator:
 *
 *   - First product's `code` matches the requested code.
 *   - Second seller's product `code` matches the same code.
 *   - Seller A and Seller B have different `id` values.
 * - The duplicate creation attempt for Seller A is wrapped with await
 *   TestValidator.error, ensuring it throws but without asserting HTTP status
 *   codes or error bodies.
 */
export async function test_api_seller_product_creation_validation_of_unique_code_per_seller(
  connection: api.IConnection,
) {
  // 1. Register first seller (Seller A) and authenticate
  const sellerARequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerA: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerARequest,
    });
  typia.assert(sellerA);

  // 2. Seller A creates first product with a unique business code
  const productCode = "SKU-UNIQ-001";

  const productCreateA1 = {
    code: productCode,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.name(1),
    status: "active",
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const productA1: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateA1,
    });
  typia.assert(productA1);

  // Validate that the stored code matches the requested code
  TestValidator.equals(
    "first product code must match requested code for seller A",
    productA1.code,
    productCode,
  );

  // Validate seller ownership id presence
  TestValidator.equals(
    "first product seller id must match seller A id",
    productA1.shopping_mall_seller_id,
    sellerA.id,
  );

  // 3. Attempt to create another product with the same code for Seller A (must fail)
  const productCreateA2 = {
    code: productCode, // same code as before
    title: RandomGenerator.paragraph({ sentences: 4 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.name(1),
    status: "active",
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  await TestValidator.error(
    "duplicate product code for same seller must be rejected",
    async () => {
      await api.functional.shoppingMall.seller.products.create(connection, {
        body: productCreateA2,
      });
    },
  );

  // 4. Register second seller (Seller B) and authenticate
  const sellerBRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerB: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBRequest,
    });
  typia.assert(sellerB);

  // Ensure Seller B is a different account
  TestValidator.notEquals(
    "seller B id must differ from seller A id",
    sellerB.id,
    sellerA.id,
  );

  // 5. Seller B creates a product with the same business code successfully
  const productCreateB1 = {
    code: productCode, // same logical business code reused by different seller
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.name(1),
    status: "active",
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const productB1: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateB1,
    });
  typia.assert(productB1);

  // Validate code matches and ownership is Seller B
  TestValidator.equals(
    "second seller product code must match shared business code",
    productB1.code,
    productCode,
  );

  TestValidator.equals(
    "second seller product seller id must match seller B id",
    productB1.shopping_mall_seller_id,
    sellerB.id,
  );

  // Final cross-check: different sellers own products with the same code
  TestValidator.notEquals(
    "products with same code must belong to different sellers",
    productA1.shopping_mall_seller_id,
    productB1.shopping_mall_seller_id,
  );
}
