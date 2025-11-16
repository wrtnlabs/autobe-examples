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
 * Validate that seller-side product creation rejects a non-existent brand
 * reference.
 *
 * Business goal: Ensure that POST /shoppingMall/seller/products enforces
 * foreign key / domain validation on `shopping_mall_brand_id` so that sellers
 * cannot bind products to arbitrary or non-existent brands. Only real
 * `shopping_mall_brands` records should be acceptable.
 *
 * Scenario steps:
 *
 * 1. Register a new seller using POST /auth/seller/join to obtain an authenticated
 *    seller session and token.
 * 2. Build an IShoppingMallProduct.ICreate payload where:
 *
 *    - `shopping_mall_seller_id` matches the authenticated seller.seller.id.
 *    - `shopping_mall_brand_id` is a random UUID that should not exist.
 *    - All other fields (code, name, status, is_multi_sku, etc.) are valid.
 * 3. Call api.functional.shoppingMall.seller.products.create with this body.
 * 4. Assert that the call fails using TestValidator.error, confirming business
 *    rules around brand existence are enforced.
 */
export async function test_api_seller_product_creation_invalid_brand_reference(
  connection: api.IConnection,
) {
  // 1. Register a new seller and obtain authorized session
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    storeName: RandomGenerator.name(2),
    // contactPhone is optional; include a realistic format sometimes
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized = await api.functional.auth.seller.join(connection, {
    body: joinRequest,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Build product creation payload with invalid brand reference
  const invalidBrandId = typia.random<string & tags.Format<"uuid">>();

  const createBody = {
    shopping_mall_seller_id: sellerAuthorized.seller.id,
    shopping_mall_brand_id: invalidBrandId,
    code: RandomGenerator.alphabets(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri:
      "https://cdn.example.com/products/" + RandomGenerator.alphaNumeric(12),
    additional_data: JSON.stringify({
      tags: ["invalid-brand-test"],
      note: "This product intentionally references a non-existent brand.",
    }),
  } satisfies IShoppingMallProduct.ICreate;

  // 3. Attempt to create product and expect failure
  await TestValidator.error(
    "product creation must fail when shopping_mall_brand_id does not exist",
    async () => {
      await api.functional.shoppingMall.seller.products.create(connection, {
        body: createBody,
      });
    },
  );
}
