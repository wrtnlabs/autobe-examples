import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";

/**
 * Validate that seller registration rejects duplicate public store names.
 *
 * Business context:
 *
 * - Sellers join the shopping mall platform via POST /auth/seller/join.
 * - Each seller provides login credentials and a public-facing `storeName`.
 * - The backend enforces a uniqueness constraint on
 *   shopping_mall_seller.store_name so that two different seller accounts
 *   cannot share the same store label.
 *
 * This test verifies that:
 *
 * 1. A seller can successfully register with a unique email and storeName,
 *    receiving a valid IShoppingMallSeller.IAuthorized payload.
 * 2. A second registration attempt using a different unique email but the same
 *    storeName is rejected as a business rule violation.
 * 3. The rejection is surfaced as an error from api.functional.auth.seller.join,
 *    validated using TestValidator.error (without checking specific HTTP status
 *    codes).
 */
export async function test_api_seller_join_rejects_duplicate_store_name(
  connection: api.IConnection,
) {
  // 1. Prepare shared randomized store name and distinct seller emails.
  const storeName: string = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 10,
  });

  const firstEmail: string = typia.random<string & tags.Format<"email">>();
  const secondEmail: string = typia.random<string & tags.Format<"email">>();

  // 2. First seller join should succeed with unique email + storeName.
  const firstRequestBody = {
    email: firstEmail,
    password: RandomGenerator.alphaNumeric(12),
    storeName,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const firstSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: firstRequestBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(firstSeller);

  // Basic sanity checks on returned authorized seller info.
  TestValidator.predicate(
    "first seller id should be non-empty UUID string",
    typeof firstSeller.id === "string" && firstSeller.id.length > 0,
  );
  TestValidator.equals(
    "first seller email should match join request email",
    firstSeller.email,
    firstEmail,
  );
  TestValidator.equals(
    "first seller store_name should match requested storeName",
    firstSeller.store_name,
    storeName,
  );

  // 3. Second seller join with same storeName but different email must fail.
  const secondRequestBody = {
    email: secondEmail,
    password: RandomGenerator.alphaNumeric(12),
    storeName,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  await TestValidator.error(
    "second seller join with duplicate storeName must be rejected",
    async () => {
      await api.functional.auth.seller.join(connection, {
        body: secondRequestBody,
      });
    },
  );

  // 4. Ensure the first seller object still looks valid (no mutation expected).
  typia.assert<IShoppingMallSeller.IAuthorized>(firstSeller);
}
