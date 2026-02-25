import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_profile_update_display_name_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random user ID (simulating an existing user)
  const userId = typia.random<string & tags.Format<"uuid">>();
  // Generate a random display name for update (1-50 characters)
  const displayName = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 1,
    wordMax: 5,
  });
  // Ensure length constraints are satisfied (min 1, max 50) - truncate if needed
  const safeDisplayName = displayName.slice(0, 50) || "a";
  // Prepare update body
  const body = {
    display_name: safeDisplayName,
  } satisfies ITodoAppUser.IUpdate;
  // Call the update endpoint
  const updatedUser = await api.functional.todoApp.users.update(connection, {
    userId,
    body,
  });
  // Validate the response matches ITodoAppUser structure
  typia.assert(updatedUser);
  // Verify that response includes the expected fields
  TestValidator.equals(
    "response has id field",
    typeof updatedUser.id,
    "string",
  );
  TestValidator.equals(
    "response has email field",
    typeof updatedUser.email,
    "string",
  );
  TestValidator.equals(
    "response has display_name field",
    typeof updatedUser.display_name,
    "string",
  );
  TestValidator.equals(
    "response has created_at field",
    typeof updatedUser.created_at,
    "string",
  );
  TestValidator.equals(
    "response has updated_at field",
    typeof updatedUser.updated_at,
    "string",
  );
  TestValidator.predicate(
    "deleted_at is either null or string",
    updatedUser.deleted_at === null ||
      typeof updatedUser.deleted_at === "string",
  );
  // Verify that the display name matches the input
  TestValidator.equals(
    "display_name matches input",
    updatedUser.display_name,
    safeDisplayName,
  );
  // Verify that timestamps are valid ISO strings
  TestValidator.predicate(
    "created_at is valid date",
    () => !isNaN(Date.parse(updatedUser.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    () => !isNaN(Date.parse(updatedUser.updated_at)),
  );
  // Verify updated_at is not before created_at (should be >=)
  const createdAt = new Date(updatedUser.created_at);
  const updatedAt = new Date(updatedUser.updated_at);
  TestValidator.predicate(
    "updated_at not before created_at",
    updatedAt >= createdAt,
  );
}
