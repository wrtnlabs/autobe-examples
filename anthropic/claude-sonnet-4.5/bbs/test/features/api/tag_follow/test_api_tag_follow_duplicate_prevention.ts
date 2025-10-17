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
 * Test that the system prevents duplicate tag follows, ensuring a member cannot
 * follow the same tag multiple times.
 *
 * This test validates the duplicate prevention logic for tag following
 * functionality.
 *
 * Workflow:
 *
 * 1. Create a new member account for testing
 * 2. Create an administrator account to manage tags
 * 3. Administrator creates a tag
 * 4. Member successfully follows the tag
 * 5. Member attempts to follow the same tag again
 * 6. Verify the duplicate follow is rejected
 */
export async function test_api_tag_follow_duplicate_prevention(
  connection: api.IConnection,
) {
  // 1. Create a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const memberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Store member token for later use
  const memberToken = member.token.access;

  // 2. Create an administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const adminUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: adminPassword,
      } satisfies IDiscussionBoardAdministrator.ICreate,
    });
  typia.assert(admin);

  // 3. Administrator creates a tag
  const tagName = RandomGenerator.name(2).toLowerCase();
  const tag: IDiscussionBoardTag =
    await api.functional.discussionBoard.administrator.tags.create(connection, {
      body: {
        name: tagName,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(tag);

  // Restore member authentication context
  connection.headers = connection.headers || {};
  connection.headers.Authorization = memberToken;

  // 4. Member successfully follows the tag for the first time
  const firstFollow: IDiscussionBoardFollowedTag =
    await api.functional.discussionBoard.member.users.followedTags.create(
      connection,
      {
        userId: member.id,
        body: {
          discussion_board_tag_id: tag.id,
        } satisfies IDiscussionBoardFollowedTag.ICreate,
      },
    );
  typia.assert(firstFollow);

  // Validate first follow was successful
  TestValidator.equals(
    "followed tag references correct tag",
    firstFollow.discussion_board_tag_id,
    tag.id,
  );
  TestValidator.equals(
    "followed tag references correct member",
    firstFollow.discussion_board_member_id,
    member.id,
  );

  // 5. Member attempts to follow the same tag again - should fail with business logic error
  await TestValidator.error(
    "duplicate tag follow should be rejected by business rules",
    async () => {
      await api.functional.discussionBoard.member.users.followedTags.create(
        connection,
        {
          userId: member.id,
          body: {
            discussion_board_tag_id: tag.id,
          } satisfies IDiscussionBoardFollowedTag.ICreate,
        },
      );
    },
  );
}
