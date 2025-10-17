import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test tag status transitions through the complete lifecycle managed by
 * moderators.
 *
 * This test validates the tag approval workflow where moderator-created tags
 * start with pending_review status and can be activated, that active tags can
 * be disabled to hide them from tag selection interfaces while preserving
 * existing topic associations, and that tags can be marked as merged when
 * consolidating duplicate or similar tags.
 *
 * Test workflow:
 *
 * 1. Create moderator account and authenticate
 * 2. Create a new tag that starts with pending_review status
 * 3. Update tag status to active to approve for general use
 * 4. Update tag status to disabled to hide from selection
 * 5. Update tag status to merged indicating consolidation
 * 6. Verify each status change properly updates the tag record
 */
export async function test_api_tag_status_lifecycle_management(
  connection: api.IConnection,
) {
  // 1. Create moderator account and authenticate
  const adminId = typia.random<string & tags.Format<"uuid">>();
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      appointed_by_admin_id: adminId,
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: moderatorEmail,
      password: moderatorPassword,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // 2. Create a new tag that starts with pending_review status
  const tagName = RandomGenerator.name(2);
  const tagDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });

  const createdTag = await api.functional.discussionBoard.moderator.tags.create(
    connection,
    {
      body: {
        name: tagName,
        description: tagDescription,
      } satisfies IDiscussionBoardTag.ICreate,
    },
  );
  typia.assert(createdTag);

  TestValidator.equals(
    "created tag name matches input",
    createdTag.name,
    tagName.toLowerCase(),
  );
  TestValidator.equals(
    "created tag description matches input",
    createdTag.description,
    tagDescription,
  );
  TestValidator.equals(
    "moderator-created tag starts with pending_review status",
    createdTag.status,
    "pending_review",
  );

  // 3. Update tag status to active to approve for general use
  const activeTag = await api.functional.discussionBoard.moderator.tags.update(
    connection,
    {
      tagId: createdTag.id,
      body: {
        status: "active",
      } satisfies IDiscussionBoardTag.IUpdate,
    },
  );
  typia.assert(activeTag);

  TestValidator.equals(
    "tag ID remains unchanged after update",
    activeTag.id,
    createdTag.id,
  );
  TestValidator.equals(
    "tag status updated to active",
    activeTag.status,
    "active",
  );
  TestValidator.equals(
    "tag name unchanged after status update",
    activeTag.name,
    createdTag.name,
  );

  // 4. Update tag status to disabled to hide from selection
  const disabledTag =
    await api.functional.discussionBoard.moderator.tags.update(connection, {
      tagId: createdTag.id,
      body: {
        status: "disabled",
      } satisfies IDiscussionBoardTag.IUpdate,
    });
  typia.assert(disabledTag);

  TestValidator.equals(
    "tag ID remains unchanged after disabling",
    disabledTag.id,
    createdTag.id,
  );
  TestValidator.equals(
    "tag status updated to disabled",
    disabledTag.status,
    "disabled",
  );
  TestValidator.equals(
    "tag name unchanged after disabling",
    disabledTag.name,
    createdTag.name,
  );

  // 5. Update tag status to merged indicating consolidation
  const mergedTag = await api.functional.discussionBoard.moderator.tags.update(
    connection,
    {
      tagId: createdTag.id,
      body: {
        status: "merged",
      } satisfies IDiscussionBoardTag.IUpdate,
    },
  );
  typia.assert(mergedTag);

  TestValidator.equals(
    "tag ID remains unchanged after merging",
    mergedTag.id,
    createdTag.id,
  );
  TestValidator.equals(
    "tag status updated to merged",
    mergedTag.status,
    "merged",
  );
  TestValidator.equals(
    "tag name unchanged after merging",
    mergedTag.name,
    createdTag.name,
  );

  // 6. Verify updated_at timestamp changes with each status update
  TestValidator.predicate(
    "updated_at timestamp changes from created to active",
    new Date(activeTag.updated_at).getTime() >=
      new Date(createdTag.updated_at).getTime(),
  );
  TestValidator.predicate(
    "updated_at timestamp changes from active to disabled",
    new Date(disabledTag.updated_at).getTime() >=
      new Date(activeTag.updated_at).getTime(),
  );
  TestValidator.predicate(
    "updated_at timestamp changes from disabled to merged",
    new Date(mergedTag.updated_at).getTime() >=
      new Date(disabledTag.updated_at).getTime(),
  );
}
