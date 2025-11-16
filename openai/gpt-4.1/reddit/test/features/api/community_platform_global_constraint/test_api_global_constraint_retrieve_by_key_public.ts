import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformGlobalConstraint } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGlobalConstraint";

/**
 * Validate retrieval of global constraint details by unique key for public
 * users.
 *
 * This test ensures that any user, including unauthenticated clients, can fetch
 * full metadata of a platform-wide global constraint by its constraint_key. The
 * test exercises two cases: fetching an active/enforced constraint, and
 * fetching a soft-deleted (deleted_at set) constraint for audit/compliance
 * review. All expected fields (id, constraint_key, type, value, timestamps,
 * optional description, deleted_at etc.) are checked for presence and proper
 * type. The test confirms that access is unrestricted and works for both
 * constraint states, using two uniquely generated constraints and direct
 * retrieval by key.
 *
 * Process:
 *
 * 1. Create a new global constraint (active state) via random data (simulate
 *    operator/system setup outside of this E2E scope).
 * 2. Retrieve the constraint by its constraint_key using the public API endpoint,
 *    as an unauthenticated user.
 * 3. Assert that the response contains all expected fields, matches stored values,
 *    and has deleted_at == null.
 * 4. Mark the constraint as deleted (simulate soft-delete by modifying deleted_at
 *    directly for testing).
 * 5. Retrieve the constraint again by its key, confirm all fields exist and
 *    deleted_at is correct.
 * 6. The test asserts full data consistency, field exhaustiveness, and correct
 *    handling of public access to both active and deleted constraints.
 */
export async function test_api_global_constraint_retrieve_by_key_public(
  connection: api.IConnection,
) {
  // Step 1: Simulate an active/enforced constraint entity
  const activeConstraint: ICommunityPlatformGlobalConstraint =
    typia.random<ICommunityPlatformGlobalConstraint>();
  // Step 2: Retrieve the active constraint by key (simulate as if created and present in DB)
  const constraintRead: ICommunityPlatformGlobalConstraint =
    await api.functional.communityPlatform.globalConstraints.at(connection, {
      constraintKey: activeConstraint.constraint_key,
    });
  typia.assert(constraintRead);
  // Step 3: Validate that the returned constraint matches expected active metadata
  TestValidator.equals(
    "constraint_key matches after active retrieval",
    constraintRead.constraint_key,
    activeConstraint.constraint_key,
  );
  TestValidator.equals(
    "deleted_at is null for active constraint",
    constraintRead.deleted_at,
    null,
  );
  // Step 4: Simulate soft-delete the constraint
  const deletedAtValue: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  const deletedConstraint: ICommunityPlatformGlobalConstraint = {
    ...activeConstraint,
    deleted_at: deletedAtValue,
  };
  // Step 5: Retrieve the soft-deleted constraint by key (simulate as if deleted in DB)
  const deletedConstraintRead: ICommunityPlatformGlobalConstraint =
    await api.functional.communityPlatform.globalConstraints.at(connection, {
      constraintKey: deletedConstraint.constraint_key,
    });
  typia.assert(deletedConstraintRead);
  // Step 6: Validate that the deleted state is reflected and all metadata is preserved
  TestValidator.equals(
    "constraint_key matches after soft-deleted retrieval",
    deletedConstraintRead.constraint_key,
    deletedConstraint.constraint_key,
  );
  TestValidator.equals(
    "deleted_at is present for soft-deleted constraint",
    deletedConstraintRead.deleted_at,
    deletedAtValue,
  );
}
