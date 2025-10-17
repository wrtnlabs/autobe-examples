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
 * Test authorization validation for tag following operations.
 *
 * This test validates that members can only create followed tag relationships
 * for their own account, preventing unauthorized tag following on behalf of
 * other users. It ensures the API enforces proper authorization boundaries by
 * validating that the authenticated user's ID matches the userId path
 * parameter.
 *
 * Workflow:
 *
 * 1. Create second member account (we only need their ID for testing)
 * 2. Create administrator account and authenticate for tag creation
 * 3. Administrator creates a tag to be used in follow relationship testing
 * 4. Create first member account (their auth becomes active)
 * 5. Attempt to create followed tag for second member (should fail authorization)
 * 6. Verify first member can successfully follow tags for their own account
 */
export async function test_api_tag_follow_authorization_validation(
  connection: api.IConnection,
) {
  // Step 1: Create second member account (we only need their ID)
  const secondMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<
          string & tags.MinLength<8> & tags.MaxLength<128>
        >(),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(secondMember);

  // Step 2: Create administrator account and authenticate
  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<
          string & tags.MinLength<8> & tags.MaxLength<128>
        >(),
      } satisfies IDiscussionBoardAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 3: Administrator creates a tag for testing
  const tag: IDiscussionBoardTag =
    await api.functional.discussionBoard.administrator.tags.create(connection, {
      body: {
        name: RandomGenerator.alphabets(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<15>
          >(),
        ),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(tag);

  // Step 4: Create first member account (their authentication becomes active)
  const firstMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<
          string & tags.MinLength<8> & tags.MaxLength<128>
        >(),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(firstMember);

  // Step 5: Attempt to create followed tag for second member (should fail authorization)
  await TestValidator.error(
    "member cannot follow tags on behalf of other users",
    async () => {
      await api.functional.discussionBoard.member.users.followedTags.create(
        connection,
        {
          userId: secondMember.id,
          body: {
            discussion_board_tag_id: tag.id,
          } satisfies IDiscussionBoardFollowedTag.ICreate,
        },
      );
    },
  );

  // Step 6: Verify first member can successfully follow tags for their own account
  const followedTag: IDiscussionBoardFollowedTag =
    await api.functional.discussionBoard.member.users.followedTags.create(
      connection,
      {
        userId: firstMember.id,
        body: {
          discussion_board_tag_id: tag.id,
        } satisfies IDiscussionBoardFollowedTag.ICreate,
      },
    );
  typia.assert(followedTag);

  // Validate the followed tag relationship
  TestValidator.equals(
    "followed tag member ID matches first member",
    followedTag.discussion_board_member_id,
    firstMember.id,
  );
  TestValidator.equals(
    "followed tag ID matches created tag",
    followedTag.discussion_board_tag_id,
    tag.id,
  );
}
