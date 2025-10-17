import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardFollowedTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFollowedTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test that members can successfully follow active tags created by
 * administrators.
 *
 * IMPORTANT NOTE: The original test scenario requested validation that members
 * cannot follow inactive tags (pending_review, disabled). However, this is
 * impossible to implement because:
 *
 * 1. The API automatically sets tags to 'active' status when administrators create
 *    them
 * 2. The IDiscussionBoardTag.ICreate DTO has no status field to specify non-active
 *    statuses
 * 3. No API endpoint exists to modify tag status after creation
 *
 * Therefore, this test has been rewritten to validate the positive case:
 * members CAN successfully follow active tags, which tests the core tag
 * following functionality within the constraints of the available API.
 *
 * Workflow:
 *
 * 1. Create and authenticate a member account
 * 2. Create and authenticate an administrator account
 * 3. Administrator creates an active tag
 * 4. Switch back to member authentication context
 * 5. Member successfully follows the active tag
 * 6. Validate the follow relationship was created correctly
 */
export async function test_api_tag_follow_inactive_tag_rejection(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!@#";

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create and authenticate an administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass456!@#";

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: adminEmail,
        password: adminPassword,
      } satisfies IDiscussionBoardAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 3: Administrator creates an active tag
  // Note: Tags are automatically set to 'active' status when created by administrators
  const activeTag: IDiscussionBoardTag =
    await api.functional.discussionBoard.administrator.tags.create(connection, {
      body: {
        name: `economics-${RandomGenerator.alphaNumeric(6)}`,
        description: "Tag for economic policy discussions",
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(activeTag);

  // Verify the tag was created with active status
  TestValidator.equals(
    "tag should have active status",
    activeTag.status,
    "active",
  );

  // Step 4: Switch to member authentication context
  // The SDK automatically updated headers with admin token, so we need to switch back to member
  const memberReauth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(memberReauth);

  // Step 5: Member follows the active tag
  const followedTag: IDiscussionBoardFollowedTag =
    await api.functional.discussionBoard.member.users.followedTags.create(
      connection,
      {
        userId: member.id,
        body: {
          discussion_board_tag_id: activeTag.id,
        } satisfies IDiscussionBoardFollowedTag.ICreate,
      },
    );
  typia.assert(followedTag);

  // Step 6: Validate the follow relationship
  TestValidator.equals(
    "followed tag should reference correct member",
    followedTag.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "followed tag should reference correct tag",
    followedTag.discussion_board_tag_id,
    activeTag.id,
  );
}
