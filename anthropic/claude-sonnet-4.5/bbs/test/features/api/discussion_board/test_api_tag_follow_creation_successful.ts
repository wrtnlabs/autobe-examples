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
 * Test successful tag following workflow for personalized content discovery.
 *
 * This test validates the complete process of a member following a tag to
 * customize their discussion board experience. It ensures proper integration
 * between member authentication, administrator tag creation, and the tag
 * following mechanism that enables personalized recommendations.
 *
 * Workflow:
 *
 * 1. Create and authenticate an administrator account
 * 2. Administrator creates an active tag
 * 3. Create and authenticate a member account
 * 4. Member follows the created tag
 * 5. Validate the followed tag relationship and response data
 */
export async function test_api_tag_follow_creation_successful(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate an administrator account
  const adminBody = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass456!@#",
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminBody,
    });
  typia.assert(admin);

  // Step 2: Administrator creates an active tag
  const tagBody = {
    name: RandomGenerator.name(1).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardTag.ICreate;

  const tag: IDiscussionBoardTag =
    await api.functional.discussionBoard.administrator.tags.create(connection, {
      body: tagBody,
    });
  typia.assert(tag);

  // Step 3: Create and authenticate a new member account
  const memberBody = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!@#",
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberBody,
    });
  typia.assert(member);

  // Step 4: Member follows the created tag
  const followBody = {
    discussion_board_tag_id: tag.id,
  } satisfies IDiscussionBoardFollowedTag.ICreate;

  const followedTag: IDiscussionBoardFollowedTag =
    await api.functional.discussionBoard.member.users.followedTags.create(
      connection,
      {
        userId: member.id,
        body: followBody,
      },
    );
  typia.assert(followedTag);

  // Step 5: Validate the followed tag relationship
  TestValidator.equals(
    "followed tag should reference the created tag",
    followedTag.discussion_board_tag_id,
    tag.id,
  );

  TestValidator.equals(
    "followed tag should reference the member",
    followedTag.discussion_board_member_id,
    member.id,
  );
}
