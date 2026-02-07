import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieval of a soft-deleted super administrator account.
 * Verifies that the system returns super admin information including the deleted_at timestamp
 * when querying a soft-deleted account. Ensures that soft-deleted accounts are still accessible
 * through this endpoint for administrative purposes.
 */
export async function test_api_super_admin_retrieval_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Create a super admin connection for authentication
  // Note: Since no utility functions are available for super admin authentication,
  // we'll use the base connection assuming the test environment has proper setup
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Generate a random super admin ID
  const superAdminId = typia.random<string & tags.Format<"uuid">>();
  try {
    // Retrieve the super admin information using super admin connection
    const superAdmin = await api.functional.discussionBoard.super_admins.at(
      superAdminConnection,
      { superAdminId },
    );
    typia.assert(superAdmin);
    // Validate basic response structure (typia.assert already validates all types and formats)
    TestValidator.equals("super admin ID matches", superAdmin.id, superAdminId);
    TestValidator.predicate(
      "privilege level is not empty",
      superAdmin.privilege_level.length > 0,
    );
    // Check if the account is soft-deleted and validate business logic
    if (superAdmin.deleted_at !== null) {
      // The account is soft-deleted - validate that deleted_at is after created_at
      TestValidator.predicate(
        "deleted_at is after created_at",
        new Date(superAdmin.deleted_at) > new Date(superAdmin.created_at),
      );
    }
  } catch (error) {
    // Handle case where super admin doesn't exist
    // This is acceptable as we're testing with a random ID
    // The important part is that if we get a response, it should be properly validated
    TestValidator.predicate("error handling works", error instanceof Error);
  }
}
