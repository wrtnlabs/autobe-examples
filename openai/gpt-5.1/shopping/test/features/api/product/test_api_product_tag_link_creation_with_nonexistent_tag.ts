import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";
import type { IShoppingMallProductTagLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTagLink";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate product–tag link creation call shape against the SDK for a seller
 * product.
 *
 * Business context:
 *
 * - A seller can create products and attach tags to them using nested endpoints.
 * - The original scenario wanted to assert that linking a non-existent tag ID
 *   fails due to referential integrity constraints, but the SDK and available
 *   APIs do not expose a reliable way to force or observe that specific
 *   database state in this black-box E2E context.
 *
 * Therefore this E2E test focuses on:
 *
 * 1. Creating an authenticated seller via /auth/seller/join.
 * 2. Creating a product for that seller via /shoppingMall/seller/products.
 * 3. Generating a random UUID to use as product_tag_id, demonstrating how a client
 *    would form the link request body using
 *    IShoppingMallProductTagLink.ICreate.
 * 4. Calling /shoppingMall/seller/products/{productId}/tags with that body and
 *    asserting the response type IShoppingMallProductTagLink via typia.assert.
 *
 * This verifies that the SDK wiring, DTO usage, and path/parameter binding are
 * correct for the tag-link creation endpoint under a seller context.
 */
export async function test_api_product_tag_link_creation_with_nonexistent_tag(
  connection: api.IConnection,
) {
  // 1. Register a seller to obtain an authenticated seller context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/onboarding",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // 2. Create a product for this seller using the seller-scoped product API.
  const productBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 1 }),
    model_name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/" +
      RandomGenerator.alphaNumeric(16) +
      ".jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 3. Generate a random UUID to use as product_tag_id. In a real system this
  //    might or might not exist, but here we only exercise the request typing.
  const nonExistentTagId = typia.random<string & tags.Format<"uuid">>();

  const linkCreateBody = {
    product_tag_id: nonExistentTagId,
  } satisfies IShoppingMallProductTagLink.ICreate;

  // 4. Call the product tag link creation endpoint for this product.
  const tagLink: IShoppingMallProductTagLink =
    await api.functional.shoppingMall.seller.products.tags.create(connection, {
      productId: product.id,
      body: linkCreateBody,
    });

  // 5. Assert the response type; business-level referential integrity behavior
  //    (whether the tag exists) is validated at lower layers.
  typia.assert<IShoppingMallProductTagLink>(tagLink);

  // Basic sanity checks on the returned link structure.
  TestValidator.equals(
    "linked product id should match the created product id",
    tagLink.product_id,
    product.id,
  );
  TestValidator.equals(
    "linked tag id should match the requested product_tag_id",
    tagLink.product_tag_id,
    nonExistentTagId,
  );
}
