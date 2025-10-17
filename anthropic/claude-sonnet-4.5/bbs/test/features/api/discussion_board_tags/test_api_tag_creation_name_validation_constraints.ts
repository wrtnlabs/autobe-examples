import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test comprehensive tag name validation constraints.
 *
 * This test validates that the tag creation endpoint properly enforces naming
 * convention requirements including length constraints (2-30 characters) and
 * character pattern rules (alphanumeric with spaces and hyphens allowed).
 *
 * Workflow:
 *
 * 1. Authenticate as moderator via join
 * 2. Attempt to create tag with name too short (1 character) - should fail
 * 3. Attempt to create tag with name too long (31+ characters) - should fail
 * 4. Attempt to create tag with invalid characters (special symbols) - should fail
 * 5. Create tag with valid name at minimum length (2 characters) - should succeed
 * 6. Create tag with valid name at maximum length (30 characters) - should succeed
 * 7. Create tag with valid alphanumeric name with hyphens and spaces - should
 *    succeed
 */
export async function test_api_tag_creation_name_validation_constraints(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const adminId = typia.random<string & tags.Format<"uuid">>();
  const moderatorData = {
    appointed_by_admin_id: adminId,
    username: RandomGenerator.alphaNumeric(15),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Attempt to create tag with name too short (1 character) - should fail
  await TestValidator.error(
    "tag name with 1 character should fail validation",
    async () => {
      await api.functional.discussionBoard.moderator.tags.create(connection, {
        body: {
          name: "a",
          description: "Short name test",
        } satisfies IDiscussionBoardTag.ICreate,
      });
    },
  );

  // Step 3: Attempt to create tag with name too long (31+ characters) - should fail
  await TestValidator.error(
    "tag name with 31 characters should fail validation",
    async () => {
      await api.functional.discussionBoard.moderator.tags.create(connection, {
        body: {
          name: RandomGenerator.alphabets(31),
          description: "Long name test",
        } satisfies IDiscussionBoardTag.ICreate,
      });
    },
  );

  // Step 4: Attempt to create tag with invalid characters (special symbols) - should fail
  await TestValidator.error(
    "tag name with invalid special characters should fail validation",
    async () => {
      await api.functional.discussionBoard.moderator.tags.create(connection, {
        body: {
          name: "tag@#$%",
          description: "Invalid characters test",
        } satisfies IDiscussionBoardTag.ICreate,
      });
    },
  );

  // Step 5: Create tag with valid name at minimum length (2 characters) - should succeed
  const minLengthTag =
    await api.functional.discussionBoard.moderator.tags.create(connection, {
      body: {
        name: "ab",
        description: "Minimum length tag",
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(minLengthTag);
  TestValidator.equals("minimum length tag name", minLengthTag.name, "ab");

  // Step 6: Create tag with valid name at maximum length (30 characters) - should succeed
  const maxLengthName = RandomGenerator.alphabets(30);
  const maxLengthTag =
    await api.functional.discussionBoard.moderator.tags.create(connection, {
      body: {
        name: maxLengthName,
        description: "Maximum length tag",
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(maxLengthTag);
  TestValidator.equals(
    "maximum length tag name length",
    maxLengthTag.name.length,
    30,
  );

  // Step 7: Create tag with valid alphanumeric name with hyphens and spaces - should succeed
  const validComplexTag =
    await api.functional.discussionBoard.moderator.tags.create(connection, {
      body: {
        name: "monetary-policy 2024",
        description: "Tag with spaces and hyphens",
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(validComplexTag);
  TestValidator.equals(
    "complex valid tag name",
    validComplexTag.name,
    "monetary-policy 2024",
  );
}
