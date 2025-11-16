import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that public product creation works for shopping mall catalog via the
 * unauthenticated endpoint.
 *
 * - Creates a product with all required fields using random data
 * - Verifies response matches request for business fields
 * - Asserts system fields (seller, primary_categories, created_at, updated_at)
 *   are set by backend
 * - Repeats with required fields missing, confirming rejection on business logic
 *   error
 */
export async function test_api_shopping_mall_product_creation_public_access(
  connection: api.IConnection,
) {
  // --- 1. Happy path: Successful product creation with valid data ---
  const validBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 12,
    }),
    default_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<1000000>
    >(),
    business_status: RandomGenerator.pick([
      "draft",
      "published",
      "archived",
      "blocked",
      "pending_approval",
    ] as const),
  } satisfies IShoppingMallProduct.ICreate;

  const created: IShoppingMallProduct =
    await api.functional.shoppingMall.products.create(connection, {
      body: validBody,
    });
  typia.assert(created);
  // Business fields match request
  TestValidator.equals("title matches", created.title, validBody.title);
  TestValidator.equals(
    "description matches",
    created.description,
    validBody.description,
  );
  TestValidator.equals(
    "default_price matches",
    created.default_price,
    validBody.default_price,
  );
  TestValidator.equals(
    "business_status matches",
    created.business_status,
    validBody.business_status,
  );
  // System fields populated
  TestValidator.predicate(
    "id is present",
    typeof created.id === "string" && created.id.length > 0,
  );
  TestValidator.predicate(
    "created_at set",
    typeof created.created_at === "string" && created.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at set",
    typeof created.updated_at === "string" && created.updated_at.length > 0,
  );
  TestValidator.predicate(
    "seller summary present",
    typeof created.seller === "object" &&
      !!created.seller.id &&
      !!created.seller.business_name,
  );
  TestValidator.predicate(
    "primary_categories exists as array",
    Array.isArray(created.primary_categories),
  );

  // --- 2. Error paths: Missing required fields should be rejected (business logic error, never type error) ---
  const requiredFieldKeys = [
    "title",
    "description",
    "default_price",
    "business_status",
  ] as const;
  for (const missingKey of requiredFieldKeys) {
    const incompleteBody = { ...validBody };
    delete (incompleteBody as any)[missingKey];
    // Remove the field to test backend required field business error
    await TestValidator.error(
      `error on missing required field: ${missingKey}`,
      async () => {
        await api.functional.shoppingMall.products.create(connection, {
          body: incompleteBody as any,
        });
      },
    );
  }
}
