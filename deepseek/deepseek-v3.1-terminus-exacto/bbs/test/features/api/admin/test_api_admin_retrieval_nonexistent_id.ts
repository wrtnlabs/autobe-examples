import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieval attempt using a non-existent administrator ID.
 * Verifies that the system returns an appropriate error response (404 Not Found)
 * when attempting to retrieve an administrator record that does not exist in the database.
 */
export async function test_api_admin_retrieval_nonexistent_id(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that does not correspond to any existing admin
  const nonexistentAdminId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve a non-existent administrator
  await TestValidator.error("retrieve non-existent admin", async () => {
    await api.functional.discussionBoard.admins.at(connection, {
      adminId: nonexistentAdminId,
    });
  });
}
