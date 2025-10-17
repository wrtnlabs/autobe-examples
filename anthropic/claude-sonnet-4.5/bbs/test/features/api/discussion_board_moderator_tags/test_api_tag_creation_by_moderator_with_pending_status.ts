import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test that moderators can create new tags and the system sets appropriate
 * initial status to 'pending_review' for moderator oversight.
 *
 * This test validates the tag creation workflow for moderators with proper
 * status management and approval requirements.
 *
 * Workflow:
 *
 * 1. Authenticate as moderator via join (new user context)
 * 2. Create a new tag with valid name (2-30 characters, alphanumeric with spaces
 *    and hyphens)
 * 3. Include optional description explaining tag usage
 * 4. Validate successful tag creation
 * 5. Verify the tag status is set to 'pending_review' (not 'active')
 * 6. Confirm tag name is normalized to lowercase
 * 7. Verify unique identifier is generated
 * 8. Check creation and update timestamps are set
 */
export async function test_api_tag_creation_by_moderator_with_pending_status(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as moderator
  const adminId = typia.random<string & tags.Format<"uuid">>();
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(15);
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  const moderatorRegistration = {
    appointed_by_admin_id: adminId,
    username: moderatorUsername,
    email: moderatorEmail,
    password: moderatorPassword,
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorRegistration,
  });
  typia.assert(moderator);

  // Step 2: Create a new tag with valid name and description
  const tagName = "Monetary-Policy Analysis";
  const tagDescription =
    "Discussion about central bank policies, interest rates, and monetary supply management";

  const tagCreateData = {
    name: tagName,
    description: tagDescription,
  } satisfies IDiscussionBoardTag.ICreate;

  const createdTag = await api.functional.discussionBoard.moderator.tags.create(
    connection,
    {
      body: tagCreateData,
    },
  );
  typia.assert(createdTag);

  // Step 3: Verify tag name is normalized to lowercase
  TestValidator.equals(
    "tag name should be normalized to lowercase",
    createdTag.name,
    tagName.toLowerCase(),
  );

  // Step 4: Verify tag status is 'pending_review' (critical business rule)
  TestValidator.equals(
    "tag status should be pending_review for moderator-created tags",
    createdTag.status,
    "pending_review",
  );

  // Step 5: Verify description is stored correctly
  TestValidator.equals(
    "tag description should match input",
    createdTag.description,
    tagDescription,
  );

  // Step 6: Additional validation - tag should NOT be 'active'
  TestValidator.notEquals(
    "tag status should NOT be active",
    createdTag.status,
    "active",
  );
}
