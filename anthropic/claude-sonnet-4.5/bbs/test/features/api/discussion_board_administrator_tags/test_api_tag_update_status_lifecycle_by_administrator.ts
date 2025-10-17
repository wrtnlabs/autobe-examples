import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test administrator management of complete tag lifecycle through status
 * transitions.
 *
 * This test validates that an administrator can successfully manage a tag
 * through all lifecycle states: pending_review → active → disabled → merged.
 * The test creates an administrator account, creates a tag, and performs
 * sequential status updates while verifying data integrity at each step.
 *
 * Workflow:
 *
 * 1. Register administrator account and authenticate
 * 2. Create a new tag with pending_review status
 * 3. Update tag status to active (approval)
 * 4. Update tag status to disabled (temporary hide)
 * 5. Update tag status to merged (consolidation)
 * 6. Validate each transition preserves tag data and updates timestamps
 */
export async function test_api_tag_update_status_lifecycle_by_administrator(
  connection: api.IConnection,
) {
  // Step 1: Register administrator account and authenticate
  const adminCredentials = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const adminAuthorized: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCredentials,
    });
  typia.assert(adminAuthorized);

  // Step 2: Create a new tag with pending_review status
  const tagName = RandomGenerator.name(2);
  const tagDescription = RandomGenerator.paragraph({ sentences: 5 });

  const tagCreateBody = {
    name: tagName,
    description: tagDescription,
  } satisfies IDiscussionBoardTag.ICreate;

  const createdTag: IDiscussionBoardTag =
    await api.functional.discussionBoard.administrator.tags.create(connection, {
      body: tagCreateBody,
    });
  typia.assert(createdTag);

  // Validate initial tag creation
  TestValidator.equals(
    "tag name matches",
    createdTag.name,
    tagName.toLowerCase(),
  );
  TestValidator.equals(
    "tag description matches",
    createdTag.description,
    tagDescription,
  );

  // Step 3: Update tag status to 'active' (approval for general use)
  const activeUpdateBody = {
    status: "active",
  } satisfies IDiscussionBoardTag.IUpdate;

  const activeTag: IDiscussionBoardTag =
    await api.functional.discussionBoard.administrator.tags.update(connection, {
      tagId: createdTag.id,
      body: activeUpdateBody,
    });
  typia.assert(activeTag);

  // Validate active status transition
  TestValidator.equals("tag status is active", activeTag.status, "active");
  TestValidator.equals("tag id preserved", activeTag.id, createdTag.id);
  TestValidator.equals("tag name preserved", activeTag.name, createdTag.name);
  TestValidator.equals(
    "tag description preserved",
    activeTag.description,
    createdTag.description,
  );
  TestValidator.predicate(
    "updated_at changed after status update",
    activeTag.updated_at !== createdTag.updated_at,
  );

  // Step 4: Update tag status to 'disabled' (temporarily hide from selection)
  const disabledUpdateBody = {
    status: "disabled",
  } satisfies IDiscussionBoardTag.IUpdate;

  const disabledTag: IDiscussionBoardTag =
    await api.functional.discussionBoard.administrator.tags.update(connection, {
      tagId: activeTag.id,
      body: disabledUpdateBody,
    });
  typia.assert(disabledTag);

  // Validate disabled status transition
  TestValidator.equals(
    "tag status is disabled",
    disabledTag.status,
    "disabled",
  );
  TestValidator.equals("tag id preserved", disabledTag.id, activeTag.id);
  TestValidator.equals("tag name preserved", disabledTag.name, activeTag.name);
  TestValidator.equals(
    "tag description preserved",
    disabledTag.description,
    activeTag.description,
  );
  TestValidator.predicate(
    "updated_at changed after disabled transition",
    disabledTag.updated_at !== activeTag.updated_at,
  );

  // Step 5: Update tag status to 'merged' (mark as consolidated)
  const mergedUpdateBody = {
    status: "merged",
  } satisfies IDiscussionBoardTag.IUpdate;

  const mergedTag: IDiscussionBoardTag =
    await api.functional.discussionBoard.administrator.tags.update(connection, {
      tagId: disabledTag.id,
      body: mergedUpdateBody,
    });
  typia.assert(mergedTag);

  // Validate merged status transition
  TestValidator.equals("tag status is merged", mergedTag.status, "merged");
  TestValidator.equals("tag id preserved", mergedTag.id, disabledTag.id);
  TestValidator.equals("tag name preserved", mergedTag.name, disabledTag.name);
  TestValidator.equals(
    "tag description preserved",
    mergedTag.description,
    disabledTag.description,
  );
  TestValidator.predicate(
    "updated_at changed after merged transition",
    mergedTag.updated_at !== disabledTag.updated_at,
  );

  // Final validation: Verify complete lifecycle integrity
  TestValidator.predicate(
    "created_at remains unchanged throughout lifecycle",
    mergedTag.created_at === createdTag.created_at,
  );
}
