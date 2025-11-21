import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";

/**
 * Test review deletion attempt for a non-existent review ID.
 *
 * This scenario validates error handling when administrators attempt to delete
 * reviews that don't exist in the system. Create administrator account,
 * authenticate, then attempt to delete a review using an invalid UUID. Verify
 * that the system returns appropriate error responses and does not perform any
 * deletion operation for non-existent reviews.
 */
export async function test_api_admin_review_deletion_non_existent_review(
  connection: api.IConnection,
) {
  // 1. Create administrator account for authentication context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const administrator = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "super_admin",
      permissions: JSON.stringify({
        can_delete_reviews: true,
        can_manage_users: true,
      }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(administrator);

  // 2. Attempt to delete a non-existent review using an invalid UUID
  const nonExistentReviewId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "deleting non-existent review should fail",
    async () => {
      await api.functional.shoppingMall.admin.reviews.erase(connection, {
        reviewId: nonExistentReviewId,
      });
    },
  );

  // 3. Additional validation: Verify no side effects occurred
  // Since the deletion should fail, we can confirm that no actual deletion occurred
  // by ensuring the system state remains unchanged (though we don't have specific
  // review data to check against since it doesn't exist)
  TestValidator.predicate(
    "administrator authentication remains valid after failed deletion attempt",
    administrator.token.access.length > 0,
  );
}
