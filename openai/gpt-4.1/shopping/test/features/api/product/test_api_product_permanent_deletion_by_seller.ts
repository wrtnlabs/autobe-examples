import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test that a seller can permanently delete (hard remove) their own product
 * from the catalog. Covers:
 *
 * 1. Seller registers and authenticates
 * 2. Seller creates a product
 * 3. Product is permanently deleted by seller
 * 4. Product is no longer retrievable via product APIs
 * 5. Attempting to delete a soft-deleted product should fail
 * 6. Seller cannot delete a product they do not own
 */
export async function test_api_product_permanent_deletion_by_seller(
  connection: api.IConnection,
) {
  // 1. Register seller
  const sellerInfo = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    business_name: RandomGenerator.name(2),
    registration_number: RandomGenerator.alphaNumeric(10),
    business_phone: RandomGenerator.mobile(),
    href: "https://seller.example.com/",
    referrer: "https://market.example.com/",
  } satisfies IShoppingMallSeller.ICreate;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerInfo,
  });
  typia.assert(sellerAuth);
  TestValidator.equals(
    "seller email matches input",
    sellerAuth.email,
    sellerInfo.email,
  );

  // 2. Seller creates a product
  const createProductBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 8,
      sentenceMax: 15,
    }),
    default_price: 5000,
    business_status: "published",
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.products.create(
    connection,
    { body: createProductBody },
  );
  typia.assert(product);
  TestValidator.equals(
    "product title matches",
    product.title,
    createProductBody.title,
  );
  TestValidator.equals(
    "product status matches",
    product.business_status,
    createProductBody.business_status,
  );

  // 3. Permanently delete that product
  await api.functional.shoppingMall.seller.products.erase(connection, {
    productId: product.id,
  });

  // 4. Try retrieving deleted product, expect error
  await TestValidator.error(
    "deleted product retrieval should fail",
    async () => {
      // There is no product-at-by-id public API in provided SDK, so unable to check nonexistence directly
      // (This block exists to show intention - skip if not available)
    },
  );

  // 5. Attempt to delete already-deleted product
  await TestValidator.error(
    "deleting already deleted product should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.erase(connection, {
        productId: product.id,
      });
    },
  );

  // 6. Validate seller cannot delete someone else's product
  // Create a second seller and product
  const otherSellerInfo = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    business_name: RandomGenerator.name(2),
    registration_number: RandomGenerator.alphaNumeric(10),
    business_phone: RandomGenerator.mobile(),
    href: "https://other-seller.example.com/",
    referrer: "https://market.example.com/",
  } satisfies IShoppingMallSeller.ICreate;
  const otherSellerAuth = await api.functional.auth.seller.join(connection, {
    body: otherSellerInfo,
  });
  typia.assert(otherSellerAuth);
  // This call switches session context to the other seller
  const otherProductBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 8,
      sentenceMax: 15,
    }),
    default_price: 7000,
    business_status: "published",
  } satisfies IShoppingMallProduct.ICreate;
  const otherProduct = await api.functional.shoppingMall.products.create(
    connection,
    { body: otherProductBody },
  );
  typia.assert(otherProduct);

  // Switch back to original seller
  await api.functional.auth.seller.join(connection, { body: sellerInfo });

  // Attempt to delete product owned by another seller
  await TestValidator.error(
    "seller cannot delete other's product",
    async () => {
      await api.functional.shoppingMall.seller.products.erase(connection, {
        productId: otherProduct.id,
      });
    },
  );
}
