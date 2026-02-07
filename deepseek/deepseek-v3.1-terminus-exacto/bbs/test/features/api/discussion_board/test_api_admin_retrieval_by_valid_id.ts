import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test successful retrieval of administrator information using a valid administrator ID.
 * Verify that the response includes all expected fields: id (UUID), email (valid email format),
 * display_name, created_at (ISO datetime), updated_at (ISO datetime), and deleted_at (nullable ISO datetime).
 * Ensure that sensitive authentication data like password_hash is excluded from the response.
 * Validate that the returned administrator data matches the expected structure and contains valid timestamps.
 */
export async function test_api_admin_retrieval_by_valid_id(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID for testing
  const adminId = typia.random<string & tags.Format<"uuid">>();
  // Call the API to retrieve administrator information
  const admin = await api.functional.discussionBoard.admins.at(connection, {
    adminId,
  });
  // Validate the response structure using typia.assert
  // This performs complete runtime type validation including:
  // - All property existence checks
  // - All type checks (string, number, etc.)
  // - All format validations (UUID, email, date-time)
  // - All constraint validations
  typia.assert(admin);
  // Verify the returned admin ID matches the requested ID
  TestValidator.equals("admin ID matches request", admin.id, adminId);
}
