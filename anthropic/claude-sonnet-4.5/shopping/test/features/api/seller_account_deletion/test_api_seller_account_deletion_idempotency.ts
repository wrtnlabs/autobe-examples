import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test the behavior when attempting to delete a seller account that has already
 * been deleted, validating proper handling of idempotent deletion requests and
 * soft delete state management.
 *
 * This scenario ensures the system handles repeated deletion attempts
 * gracefully and maintains data integrity throughout the process.
 *
 * Test Workflow:
 *
 * 1. Register a new seller account and obtain authentication tokens
 * 2. Perform the first deletion of the seller account
 * 3. Validate that the account is marked as deleted with deleted_at timestamp
 * 4. Attempt to delete the same account again (second deletion)
 * 5. Verify idempotent behavior - either success with same state or appropriate
 *    error
 * 6. Ensure deleted_at timestamp is preserved from the first deletion
 * 7. Confirm no data corruption or unintended side effects occurred
 */
export async function test_api_seller_account_deletion_idempotency(
  connection: api.IConnection,
) {
  // Step 1: Register a new seller account
  const sellerRegistrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile("+82"),
    business_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 7,
    }),
    business_description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 8,
      sentenceMax: 12,
    }),
    store_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 6,
    }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const registeredSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerRegistrationData,
    });
  typia.assert(registeredSeller);

  // Validate seller registration was successful
  TestValidator.equals(
    "seller email matches",
    registeredSeller.email,
    sellerRegistrationData.email,
  );
  TestValidator.equals(
    "seller full name matches",
    registeredSeller.full_name,
    sellerRegistrationData.full_name,
  );
  TestValidator.equals(
    "seller business name matches",
    registeredSeller.business_name,
    sellerRegistrationData.business_name,
  );
  TestValidator.predicate(
    "seller has valid ID",
    typia.is<string & tags.Format<"uuid">>(registeredSeller.id),
  );
  TestValidator.predicate(
    "seller has authentication token",
    registeredSeller.token.access.length > 0,
  );
  TestValidator.predicate(
    "seller is not initially deleted",
    registeredSeller.deleted_at === null ||
      registeredSeller.deleted_at === undefined,
  );

  // Step 2: Perform the first deletion of the seller account
  const firstDeletionResult: IShoppingMallSeller =
    await api.functional.shoppingMall.seller.sellers.erase(connection, {
      sellerId: registeredSeller.id,
    });
  typia.assert(firstDeletionResult);

  // Step 3: Validate the first deletion was successful
  TestValidator.equals(
    "first deletion seller ID matches",
    firstDeletionResult.id,
    registeredSeller.id,
  );
  TestValidator.predicate(
    "first deletion set deleted_at timestamp",
    firstDeletionResult.deleted_at !== null &&
      firstDeletionResult.deleted_at !== undefined,
  );

  const firstDeletedAt = typia.assert(firstDeletionResult.deleted_at!);
  TestValidator.predicate(
    "first deleted_at is valid date-time",
    typia.is<string & tags.Format<"date-time">>(firstDeletedAt),
  );

  // Store the first deletion timestamp for later comparison
  const originalDeletedAtTimestamp = firstDeletedAt;

  // Step 4: Attempt to delete the same account again (idempotent deletion)
  const secondDeletionResult: IShoppingMallSeller =
    await api.functional.shoppingMall.seller.sellers.erase(connection, {
      sellerId: registeredSeller.id,
    });
  typia.assert(secondDeletionResult);

  // Step 5 & 6: Verify idempotent behavior and timestamp preservation
  TestValidator.equals(
    "second deletion seller ID matches",
    secondDeletionResult.id,
    registeredSeller.id,
  );
  TestValidator.predicate(
    "second deletion has deleted_at timestamp",
    secondDeletionResult.deleted_at !== null &&
      secondDeletionResult.deleted_at !== undefined,
  );

  const secondDeletedAt = typia.assert(secondDeletionResult.deleted_at!);

  // Step 7: Validate that the deleted_at timestamp was preserved (idempotency)
  TestValidator.equals(
    "deleted_at timestamp preserved across deletions",
    secondDeletedAt,
    originalDeletedAtTimestamp,
  );

  // Additional validation: Ensure other account data remains consistent
  TestValidator.equals(
    "seller email unchanged",
    secondDeletionResult.email,
    registeredSeller.email,
  );
  TestValidator.equals(
    "seller business name unchanged",
    secondDeletionResult.business_name,
    registeredSeller.business_name,
  );
  TestValidator.equals(
    "seller store name unchanged",
    secondDeletionResult.store_name,
    registeredSeller.store_name,
  );
}
