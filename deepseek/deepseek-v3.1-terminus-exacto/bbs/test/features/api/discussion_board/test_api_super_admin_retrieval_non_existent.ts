import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieval attempt for a non-existent super administrator ID.
 *
 * This test verifies that the system properly handles requests for super administrator
 * records that do not exist in the database. It generates a random UUID that is
 * guaranteed not to match any existing super administrator and attempts to retrieve
 * it via the API. The test expects the system to return an appropriate error response
 * (likely 404 Not Found) with a clear error message indicating the record was not found.
 */
export async function test_api_super_admin_retrieval_non_existent(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that doesn't exist in the system
  const nonExistentSuperAdminId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the non-existent super administrator
  await TestValidator.error(
    "retrieval of non-existent super admin should fail",
    async () => {
      await api.functional.discussionBoard.super_admins.at(connection, {
        superAdminId: nonExistentSuperAdminId,
      });
    },
  );
}
