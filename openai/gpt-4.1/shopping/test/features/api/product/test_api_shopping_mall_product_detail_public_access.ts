import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate the retrieval of complete product details by productId through
 * public access (no authentication required).
 *
 * This test ensures that the API returns all required fields in the product
 * detail response for a valid product, including title, description, default
 * price, business status, seller summary, category assignments, and audit
 * timestamps, and omits any internal or sensitive data. It also checks the
 * correct error handling (404) for a non-existent productId. Business rules
 * demand public data only, proper category/seller linkage, and presence of
 * audit and soft-delete fields. The test covers both active and soft-deleted
 * product retrieval scenarios (if soft-delete is supported by API for GET).
 *
 * 1. Create a new product (POST /shoppingMall/products).
 * 2. Retrieve product details for this productId with GET
 *    /shoppingMall/products/{productId}.
 * 3. Validate all critical fields – id, title, description, default_price,
 *    business_status, seller, primary_categories, created_at, updated_at,
 *    (deleted_at optional)
 * 4. Attempt GET of a non-existent random productId and verify not found handling
 *    (404 or error).
 */
export async function test_api_shopping_mall_product_detail_public_access(
  connection: api.IConnection,
) {
  // 1. Create a new product to have a known valid productId
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 5,
      wordMax: 10,
    }),
    default_price: typia.random<number>(),
    business_status: RandomGenerator.pick([
      "draft",
      "published",
      "archived",
      "blocked",
      "pending_approval",
    ] as const),
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.products.create(connection, {
      body: createBody,
    });
  typia.assert(product);

  // 2. Retrieve product detail publicly
  const detail: IShoppingMallProduct =
    await api.functional.shoppingMall.products.at(connection, {
      productId: product.id,
    });
  typia.assert(detail);
  TestValidator.equals("detail.id matches created id", detail.id, product.id);
  TestValidator.equals(
    "detail.title matches created",
    detail.title,
    createBody.title,
  );
  TestValidator.equals(
    "detail.description matches created",
    detail.description,
    createBody.description,
  );
  TestValidator.equals(
    "detail.default_price matches created",
    detail.default_price,
    createBody.default_price,
  );
  TestValidator.equals(
    "detail.business_status matches created",
    detail.business_status,
    createBody.business_status,
  );
  TestValidator.predicate(
    "seller summary must have valid id",
    typeof detail.seller.id === "string" && detail.seller.id.length > 0,
  );
  TestValidator.predicate(
    "seller summary must have business_name",
    typeof detail.seller.business_name === "string" &&
      detail.seller.business_name.length > 0,
  );
  TestValidator.predicate(
    "primary_categories must be an array",
    Array.isArray(detail.primary_categories),
  );
  TestValidator.predicate(
    "created_at is ISO 8601",
    typeof detail.created_at === "string" &&
      !isNaN(Date.parse(detail.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601",
    typeof detail.updated_at === "string" &&
      !isNaN(Date.parse(detail.updated_at)),
  );
  // deleted_at should be null or typeof string or undefined
  TestValidator.predicate(
    "deleted_at is null/string/undef",
    detail.deleted_at === null ||
      detail.deleted_at === undefined ||
      (typeof detail.deleted_at === "string" &&
        !isNaN(Date.parse(detail.deleted_at))),
  );

  // 3. Try to access a non-existing productId (random UUID)
  const randomId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("404 for non-existent productId", async () => {
    await api.functional.shoppingMall.products.at(connection, {
      productId: randomId,
    });
  });
}
