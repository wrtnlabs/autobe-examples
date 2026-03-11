import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test validation of UUID format for admin retrieval endpoint.
 *
 * This test verifies that the GET /multiUserTodo/admins/{adminId} endpoint
 * properly rejects various invalid UUID formats with appropriate error responses.
 * Tests include strings that are too short, too long, missing hyphens, and
 * non-UUID patterns.
 */
export async function test_api_admins_retrieve_invalid_uuid_format(
  connection: api.IConnection,
): Promise<void> {
  // Test case 1: String that's too short (less than 36 characters)
  await TestValidator.error("string too short", async () => {
    await api.functional.multiUserTodo.admins.at(connection, {
      adminId: "12345678-1234-1234-1234-123456789" satisfies string, // 35 chars
    });
  });
  // Test case 2: String that's too long (more than 36 characters)
  await TestValidator.error("string too long", async () => {
    await api.functional.multiUserTodo.admins.at(connection, {
      adminId: "12345678-1234-1234-1234-1234567890123" satisfies string, // 39 chars
    });
  });
  // Test case 3: String with incorrect UUID format (missing hyphens)
  await TestValidator.error("missing hyphens", async () => {
    await api.functional.multiUserTodo.admins.at(connection, {
      adminId: "12345678123412341234123456789012" satisfies string, // 32 chars, no hyphens
    });
  });
  // Test case 4: Non-UUID string pattern
  await TestValidator.error("non-uuid pattern", async () => {
    await api.functional.multiUserTodo.admins.at(connection, {
      adminId: "admin-123" satisfies string,
    });
  });
  // Test case 5: UUID-like but invalid characters
  await TestValidator.error("invalid characters", async () => {
    await api.functional.multiUserTodo.admins.at(connection, {
      adminId: "gggggggg-gggg-gggg-gggg-gggggggggggg" satisfies string, // 'g' is not hex
    });
  });
  // Test case 6: Valid format but wrong segment lengths
  await TestValidator.error("wrong segment lengths", async () => {
    await api.functional.multiUserTodo.admins.at(connection, {
      adminId: "1234567-12345-123-12345-123456789012" satisfies string, // 8-5-3-5-12 instead of 8-4-4-4-12
    });
  });
  // Note: We cannot test numeric values because TypeScript compilation would fail
  // before runtime. The adminId parameter requires `string & tags.Format<"uuid">`,
  // and passing a number would violate the type system.
}
