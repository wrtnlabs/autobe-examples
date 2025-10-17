import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardPost";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * This test verifies the member profile update workflow.
 *
 * Steps:
 *
 * 1. Register a new member using auth/member/join
 * 2. Assert successful member authorization and token acquisition
 * 3. Create a discussion post to ensure member authentication is active
 * 4. Update the member's profile info including email, display name, and password
 * 5. Assert the updated member info persists correctly
 */
export async function test_api_discussion_board_member_update_by_member(
  connection: api.IConnection,
) {
  // Step 1: Member registration
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "ValidP@ssw0rd",
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBody });
  typia.assert(member);

  // Member ID for subsequent requests
  const memberId = typia.assert<string & tags.Format<"uuid">>(member.id);

  // Step 2: Create a discussion post to ensure member exists and session is active
  const postBody = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    post_status: "public",
  } satisfies IDiscussionBoardDiscussionBoardPost.ICreate;
  const post: IDiscussionBoardDiscussionBoardPost =
    await api.functional.discussionBoard.member.discussionBoardPosts.create(
      connection,
      { body: postBody },
    );
  typia.assert(post);

  // Step 3: Prepare update data with new email and display name
  const updateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "NewValidPass123",
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.IUpdate;

  // Step 4: Update member profile
  const updatedMember: IDiscussionBoardMember =
    await api.functional.discussionBoard.member.discussionBoardMembers.update(
      connection,
      { discussionBoardMemberId: memberId, body: updateBody },
    );
  typia.assert(updatedMember);

  // Step 5: Validate updated fields
  TestValidator.equals(
    "updated email matches",
    updatedMember.email,
    updateBody.email,
  );
  TestValidator.equals(
    "updated display name matches",
    updatedMember.display_name,
    updateBody.display_name,
  );
}
