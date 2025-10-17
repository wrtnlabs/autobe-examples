import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Validates tag name uniqueness enforcement across the discussion board.
 *
 * Tests that the system prevents duplicate tag creation by enforcing
 * case-insensitive uniqueness on tag names. This ensures tag vocabulary
 * integrity and prevents fragmentation that could confuse users.
 *
 * Steps:
 *
 * 1. Authenticate as moderator
 * 2. Create first tag with unique name
 * 3. Verify first tag creation succeeds
 * 4. Attempt duplicate tag with exact same name
 * 5. Verify duplicate is rejected
 * 6. Attempt tag with same name but different case
 * 7. Verify case variation is rejected (case-insensitive uniqueness)
 */
export async function test_api_tag_creation_name_uniqueness_enforcement(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorData = {
    appointed_by_admin_id: typia.random<string & tags.Format<"uuid">>(),
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);
  typia.assert(moderator.token);

  // Step 2: Create first tag with unique name
  const firstTagName = "monetary-policy";
  const firstTagData = {
    name: firstTagName,
    description: "Tag about monetary policy and central bank decisions",
  } satisfies IDiscussionBoardTag.ICreate;

  const firstTag = await api.functional.discussionBoard.moderator.tags.create(
    connection,
    {
      body: firstTagData,
    },
  );
  typia.assert(firstTag);

  // Step 3: Validate first tag creation succeeded
  TestValidator.equals("first tag name matches", firstTag.name, firstTagName);
  TestValidator.equals(
    "first tag description matches",
    firstTag.description,
    firstTagData.description,
  );
  TestValidator.predicate("first tag has valid ID", !!firstTag.id);
  TestValidator.predicate("first tag has created_at", !!firstTag.created_at);

  // Step 4: Attempt to create duplicate tag with exact same name
  await TestValidator.error(
    "duplicate tag name should be rejected",
    async () => {
      await api.functional.discussionBoard.moderator.tags.create(connection, {
        body: {
          name: firstTagName,
          description: "Different description but same name",
        } satisfies IDiscussionBoardTag.ICreate,
      });
    },
  );

  // Step 5: Attempt to create tag with same name but different case
  await TestValidator.error(
    "case variation of existing tag name should be rejected",
    async () => {
      await api.functional.discussionBoard.moderator.tags.create(connection, {
        body: {
          name: "Monetary-Policy",
          description: "Uppercase variation should fail",
        } satisfies IDiscussionBoardTag.ICreate,
      });
    },
  );

  // Step 6: Verify original tag remains unchanged
  const verifyTagData = {
    name: "fiscal-stimulus",
    description: "A completely different tag to verify system still works",
  } satisfies IDiscussionBoardTag.ICreate;

  const verifyTag = await api.functional.discussionBoard.moderator.tags.create(
    connection,
    {
      body: verifyTagData,
    },
  );
  typia.assert(verifyTag);
  TestValidator.equals(
    "verify tag name matches",
    verifyTag.name,
    verifyTagData.name,
  );
}
