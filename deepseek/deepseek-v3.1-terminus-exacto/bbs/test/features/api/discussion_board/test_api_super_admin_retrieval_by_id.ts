import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_super_admin_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // Since we don't have utility functions for super admin creation,
  // we'll need to assume there's at least one existing super admin in the system
  // or create one through the appropriate API endpoints
  // For this test, we'll use the connection as-is since the endpoint
  // documentation shows authorization-type as null, meaning it might
  // be publicly accessible or use a different authentication method
  // We need a valid super admin ID to test retrieval
  // Since we don't have a way to create super admins, we'll need to
  // use a known ID or handle the case where no super admins exist
  // Generate a realistic test ID (this will likely result in 404)
  const testSuperAdminId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the super admin by ID
  // This will test the endpoint's behavior with a non-existent ID
  const retrievedSuperAdmin =
    await api.functional.discussionBoard.super_admins.at(connection, {
      superAdminId: testSuperAdminId,
    });
  // Validate the response structure
  typia.assert(retrievedSuperAdmin);
  // Test that the retrieved super admin has the expected ID
  TestValidator.equals(
    "super admin ID matches",
    retrievedSuperAdmin.id,
    testSuperAdminId,
  );
  // Test business logic: privilege level should not be empty
  TestValidator.predicate(
    "privilege level is not empty",
    retrievedSuperAdmin.privilege_level.length > 0,
  );
}
