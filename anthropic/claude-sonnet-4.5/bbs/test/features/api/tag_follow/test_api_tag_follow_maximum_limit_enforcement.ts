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
 * Test the enforcement of the 50-tag follow limit for discussion board members.
 *
 * This test validates that the system correctly enforces the business rule
 * limiting members to following a maximum of 50 tags. The test creates a member
 * account, an administrator account, generates 51 tags, attempts to follow all
 * of them, and verifies that the 51st follow attempt is rejected with an
 * appropriate error.
 *
 * Workflow:
 *
 * 1. Create and authenticate a new member account
 * 2. Create and authenticate an administrator account
 * 3. Create exactly 50 tags as administrator
 * 4. Switch to member context and follow all 50 tags successfully
 * 5. Switch to administrator context and create the 51st tag
 * 6. Switch to member context and attempt to follow the 51st tag (should fail)
 * 7. Verify the error indicates the maximum limit has been reached
 */
export async function test_api_tag_follow_maximum_limit_enforcement(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new member account
  const memberCreate = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPass123!@#",
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreate,
    });
  typia.assert(member);

  // Store member token for later context switching
  const memberToken = member.token.access;

  // Step 2: Create and authenticate an administrator account
  const adminCreate = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass123!@#",
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCreate,
    });
  typia.assert(admin);

  // Store admin token for context switching
  const adminToken = admin.token.access;

  // Step 3: Create exactly 50 tags as administrator (already authenticated)
  const createdTags: IDiscussionBoardTag[] = await ArrayUtil.asyncRepeat(
    50,
    async (index) => {
      const tagCreate = {
        name: `tag-${RandomGenerator.alphaNumeric(8)}-${index}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardTag.ICreate;

      const createdTag: IDiscussionBoardTag =
        await api.functional.discussionBoard.administrator.tags.create(
          connection,
          {
            body: tagCreate,
          },
        );
      typia.assert(createdTag);
      return createdTag;
    },
  );

  TestValidator.equals("should have created 50 tags", createdTags.length, 50);

  // Step 4: Switch to member context and follow all 50 tags successfully
  connection.headers = connection.headers || {};
  connection.headers.Authorization = memberToken;

  const followedTags: IDiscussionBoardFollowedTag[] =
    await ArrayUtil.asyncRepeat(50, async (index) => {
      const followCreate = {
        discussion_board_tag_id: createdTags[index].id,
      } satisfies IDiscussionBoardFollowedTag.ICreate;

      const followedTag: IDiscussionBoardFollowedTag =
        await api.functional.discussionBoard.member.users.followedTags.create(
          connection,
          {
            userId: member.id,
            body: followCreate,
          },
        );
      typia.assert(followedTag);
      return followedTag;
    });

  TestValidator.equals("should have followed 50 tags", followedTags.length, 50);

  // Step 5: Switch to administrator context and create the 51st tag
  connection.headers.Authorization = adminToken;

  const tag51Create = {
    name: `tag-${RandomGenerator.alphaNumeric(8)}-51`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardTag.ICreate;

  const tag51: IDiscussionBoardTag =
    await api.functional.discussionBoard.administrator.tags.create(connection, {
      body: tag51Create,
    });
  typia.assert(tag51);

  // Step 6: Switch back to member context and attempt to follow the 51st tag (should fail)
  connection.headers.Authorization = memberToken;

  await TestValidator.error(
    "should reject follow request when exceeding 50-tag limit",
    async () => {
      const follow51Create = {
        discussion_board_tag_id: tag51.id,
      } satisfies IDiscussionBoardFollowedTag.ICreate;

      await api.functional.discussionBoard.member.users.followedTags.create(
        connection,
        {
          userId: member.id,
          body: follow51Create,
        },
      );
    },
  );
}
