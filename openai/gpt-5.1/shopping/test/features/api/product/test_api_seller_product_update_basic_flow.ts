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
 * Validate basic happy-path update of a seller-owned product.
 *
 * Business context:
 *
 * - A seller registers on the platform, then creates a product using the seller
 *   create endpoint.
 * - Later, the same seller updates several mutable fields of that product (title,
 *   summary, description, status, primary_image_uri).
 * - System-managed fields like id/created_at/updated_at/deleted_at and ownership
 *   relations must remain under system control.
 *
 * Steps:
 *
 * 1. Join as a new seller via /auth/seller/join to obtain an authenticated seller
 *    context (token is injected into connection headers by SDK).
 * 2. Create an initial product via POST /shoppingMall/seller/products with a
 *    fully-populated IShoppingMallProduct.ICreate body.
 * 3. Assert the created product payload type and capture it.
 * 4. Build an IShoppingMallProduct.IUpdate payload that changes several textual
 *    and status fields and sets a new primary_image_uri, while intentionally
 *    omitting other optional fields to assert they remain unchanged.
 * 5. Call PUT /shoppingMall/seller/products/{productId} for the same product id
 *    using the update payload.
 * 6. Assert updated product type and validate via TestValidator that:
 *
 *    - Id is unchanged.
 *    - Shopping_mall_seller_id is unchanged.
 *    - Updated fields (title, summary, description, status, primary_image_uri)
 *         exactly match the update payload.
 *    - Untouched fields (code, brand, model_name, default_locale) remain equal to
 *         values from the create response.
 *    - Created_at is unchanged.
 *    - Updated_at has changed compared to created_at (or at least differs from the
 *         original updated_at) to reflect the update.
 *    - Deleted_at remains null or unchanged.
 */
export async function test_api_seller_product_update_basic_flow(
  connection: api.IConnection,
) {
  // 1. Seller joins (authentication context setup)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://seller.example.com/onboarding",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert(sellerAuthorized);

  // 2. Create initial product owned by this seller
  const createBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 2 }),
    model_name: RandomGenerator.paragraph({ sentences: 2 }),
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/" +
      RandomGenerator.alphaNumeric(16) +
      ".jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const createdProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: createBody,
    });
  typia.assert(createdProduct);

  // Basic invariants on created product
  TestValidator.equals(
    "created product code should match request",
    createdProduct.code,
    createBody.code,
  );
  TestValidator.equals(
    "created product title should match request",
    createdProduct.title,
    createBody.title,
  );
  TestValidator.equals(
    "created product status should match request",
    createdProduct.status,
    createBody.status,
  );
  TestValidator.equals(
    "created product default_locale should match request",
    createdProduct.default_locale,
    createBody.default_locale,
  );

  // 3. Prepare update payload changing some but not all fields
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 3 }),
    status: "inactive",
    primary_image_uri:
      "https://cdn.example.com/images/" +
      RandomGenerator.alphaNumeric(18) +
      ".jpg",
  } satisfies IShoppingMallProduct.IUpdate;

  // 4. Call update endpoint
  const updatedProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.update(connection, {
      productId: createdProduct.id,
      body: updateBody,
    });
  typia.assert(updatedProduct);

  // 5. Validate core identity invariants
  TestValidator.equals(
    "updated product id should remain the same",
    updatedProduct.id,
    createdProduct.id,
  );
  TestValidator.equals(
    "updated product seller id should remain the same",
    updatedProduct.shopping_mall_seller_id,
    createdProduct.shopping_mall_seller_id,
  );

  // 6. Validate updated fields
  TestValidator.equals(
    "updated title should match update payload",
    updatedProduct.title,
    updateBody.title,
  );
  TestValidator.equals(
    "updated summary should match update payload",
    updatedProduct.summary,
    updateBody.summary,
  );
  TestValidator.equals(
    "updated description should match update payload",
    updatedProduct.description,
    updateBody.description,
  );
  TestValidator.equals(
    "updated status should match update payload",
    updatedProduct.status,
    updateBody.status,
  );
  TestValidator.equals(
    "updated primary_image_uri should match update payload",
    updatedProduct.primary_image_uri,
    updateBody.primary_image_uri,
  );

  // 7. Validate unchanged fields (those we did not send in update)
  TestValidator.equals(
    "code should remain unchanged when not updated",
    updatedProduct.code,
    createdProduct.code,
  );
  TestValidator.equals(
    "brand should remain unchanged when not updated",
    updatedProduct.brand,
    createdProduct.brand,
  );
  TestValidator.equals(
    "model_name should remain unchanged when not updated",
    updatedProduct.model_name,
    createdProduct.model_name,
  );
  TestValidator.equals(
    "default_locale should remain unchanged when not updated",
    updatedProduct.default_locale,
    createdProduct.default_locale,
  );

  // 8. System-managed timestamps and deletion flag
  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedProduct.created_at,
    createdProduct.created_at,
  );
  TestValidator.predicate(
    "updated_at should be different from original updated_at after update",
    updatedProduct.updated_at !== createdProduct.updated_at,
  );
  TestValidator.equals(
    "deleted_at should remain unchanged (typically null) after update",
    updatedProduct.deleted_at ?? null,
    createdProduct.deleted_at ?? null,
  );
}
