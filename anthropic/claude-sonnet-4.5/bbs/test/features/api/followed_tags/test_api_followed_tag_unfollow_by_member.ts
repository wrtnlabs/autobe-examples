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
 * Test the complete workflow of a member unfollowing a previously followed tag.
 *
 * This test validates the tag-based content discovery and personalization
 * system by ensuring users can manage their followed tags collection. The test
 * covers the full lifecycle: member registration, administrator setup for tag
 * creation, tag creation, following the tag, unfollowing it, and verifying the
 * relationship is properly removed.
 *
 * Steps:
 *
 * 1. Create a new member account through the join endpoint
 * 2. Create a new administrator account for tag creation privileges
 * 3. Create a new tag through the administrator endpoint
 * 4. Restore member authentication context and follow the tag
 * 5. Execute the DELETE operation to unfollow the tag
 * 6. Verify the operation succeeded (void return expected)
 */
export async function test_api_followed_tag_unfollow_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Store member token for later restoration
  const memberToken = member.token.access;

  // Step 2: Create administrator account for tag creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 3: Create a tag using administrator privileges
  const tagName = RandomGenerator.name(1);
  const tag = await api.functional.discussionBoard.administrator.tags.create(
    connection,
    {
      body: {
        name: tagName,
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IDiscussionBoardTag.ICreate,
    },
  );
  typia.assert(tag);

  // Step 4: Restore member authentication context
  connection.headers = connection.headers || {};
  connection.headers.Authorization = memberToken;

  const followedTag =
    await api.functional.discussionBoard.member.users.followedTags.create(
      connection,
      {
        userId: member.id,
        body: {
          discussion_board_tag_id: tag.id,
        } satisfies IDiscussionBoardFollowedTag.ICreate,
      },
    );
  typia.assert(followedTag);

  // Step 5: Execute the DELETE operation to unfollow the tag
  await api.functional.discussionBoard.member.users.followedTags.erase(
    connection,
    {
      userId: member.id,
      followedTagId: followedTag.id,
    },
  );

  // Step 6: Verify the operation succeeded (no error thrown means success)
  // The DELETE operation returns void, so successful execution without error
  // indicates that the unfollow operation completed successfully
}
