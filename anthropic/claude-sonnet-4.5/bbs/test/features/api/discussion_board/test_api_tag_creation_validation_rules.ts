import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test comprehensive validation rules for tag creation by administrators.
 *
 * This test validates that the tag creation operation properly enforces all
 * business rules including:
 *
 * - Tag name length constraints (minimum 2 characters, maximum 30 characters)
 * - Character restrictions (only alphanumeric, spaces, and hyphens allowed)
 * - Uniqueness enforcement preventing duplicate tag names even with different
 *   casing
 * - Proper normalization converting tag names to lowercase
 *
 * The test verifies error responses for various invalid inputs such as empty
 * tag names, names with special characters beyond allowed set, names exceeding
 * maximum length, and attempts to create tags with names matching existing
 * tags.
 *
 * Test workflow:
 *
 * 1. Authenticate as administrator
 * 2. Test minimum length validation (less than 2 characters should fail)
 * 3. Test maximum length validation (more than 30 characters should fail)
 * 4. Test invalid characters validation (special characters not allowed should
 *    fail)
 * 5. Create a valid tag successfully
 * 6. Test uniqueness validation (duplicate tag name should fail)
 * 7. Test case-insensitive uniqueness (same name with different casing should
 *    fail)
 * 8. Verify lowercase normalization on successful creation
 */
export async function test_api_tag_creation_validation_rules(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminCredentials = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCredentials,
    });
  typia.assert(admin);

  // Step 2: Test minimum length validation - tag name too short (1 character)
  await TestValidator.error(
    "tag name with 1 character should fail minimum length validation",
    async () => {
      await api.functional.discussionBoard.administrator.tags.create(
        connection,
        {
          body: {
            name: "a",
            description: "This should fail - name too short",
          } satisfies IDiscussionBoardTag.ICreate,
        },
      );
    },
  );

  // Step 3: Test maximum length validation - tag name too long (31 characters)
  await TestValidator.error(
    "tag name exceeding 30 characters should fail",
    async () => {
      await api.functional.discussionBoard.administrator.tags.create(
        connection,
        {
          body: {
            name: RandomGenerator.alphabets(31),
            description: "This should fail - name too long",
          } satisfies IDiscussionBoardTag.ICreate,
        },
      );
    },
  );

  // Step 4: Test invalid characters validation - special characters not allowed
  await TestValidator.error(
    "tag name with invalid special characters should fail",
    async () => {
      await api.functional.discussionBoard.administrator.tags.create(
        connection,
        {
          body: {
            name: "invalid@tag#name",
            description: "This should fail - contains @ and # characters",
          } satisfies IDiscussionBoardTag.ICreate,
        },
      );
    },
  );

  // Step 5: Create a valid tag successfully
  const validTagName = "monetary-policy";
  const firstTag: IDiscussionBoardTag =
    await api.functional.discussionBoard.administrator.tags.create(connection, {
      body: {
        name: validTagName,
        description: "Tag for discussions about monetary policy",
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(firstTag);

  // Verify the tag was created with lowercase normalization
  TestValidator.equals(
    "tag name should be normalized to lowercase",
    firstTag.name,
    validTagName.toLowerCase(),
  );

  // Step 6: Test uniqueness validation - duplicate tag name should fail
  await TestValidator.error(
    "duplicate tag name should fail uniqueness validation",
    async () => {
      await api.functional.discussionBoard.administrator.tags.create(
        connection,
        {
          body: {
            name: validTagName,
            description: "Attempting to create duplicate tag",
          } satisfies IDiscussionBoardTag.ICreate,
        },
      );
    },
  );

  // Step 7: Test case-insensitive uniqueness - same name with different casing
  await TestValidator.error(
    "tag name with different casing should fail uniqueness validation",
    async () => {
      await api.functional.discussionBoard.administrator.tags.create(
        connection,
        {
          body: {
            name: "MONETARY-POLICY",
            description:
              "Attempting to create tag with uppercase version of existing name",
          } satisfies IDiscussionBoardTag.ICreate,
        },
      );
    },
  );

  // Step 8: Verify another valid tag with mixed case gets normalized
  const mixedCaseTagName = "Trade-Agreements";
  const secondTag: IDiscussionBoardTag =
    await api.functional.discussionBoard.administrator.tags.create(connection, {
      body: {
        name: mixedCaseTagName,
        description: "Tag for international trade agreement discussions",
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(secondTag);

  // Verify lowercase normalization occurred
  TestValidator.equals(
    "mixed case tag name should be normalized to lowercase",
    secondTag.name,
    mixedCaseTagName.toLowerCase(),
  );

  // Verify tag has valid status (should be 'active' for administrator-created tags)
  TestValidator.predicate(
    "administrator-created tag should have a valid status",
    secondTag.status === "active" || secondTag.status === "pending_review",
  );
}
