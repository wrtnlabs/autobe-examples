import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardCategory";
import type { IDiscussionBoardDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardPost";
import type { IDiscussionBoardDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardReply";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * This test verifies the functionality of deleting a reply to a discussion
 * board post by a moderator.
 *
 * The test workflow is as follows:
 *
 * 1. Create a new moderator account and authenticate it to obtain authorization
 *    tokens.
 * 2. Create a new discussion board category by an admin or as a prerequisite.
 * 3. Create a new member account and authenticate it.
 * 4. Create a new discussion board post under the created category by the member.
 * 5. Create a reply to that post by the member.
 * 6. Authenticate again as the moderator to ensure valid token usage.
 * 7. Delete the reply using the moderator's credentials.
 * 8. Attempt deletion of the same reply again to confirm it is removed (expect
 *    error).
 * 9. Attempt unauthorized deletion and expect failure (optional).
 *
 * All steps use realistic test data adhering to DTO constraints. The test
 * asserts proper role-based authorization and successful deletion.
 */
export async function test_api_discussion_board_delete_reply_by_moderator(
  connection: api.IConnection,
) {
  // 1. Moderator join and authenticate
  const moderatorCreateBody = {
    email: `mod_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "Moderate123",
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderatorAuth: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join.joinModerator(connection, {
      body: moderatorCreateBody,
    });
  typia.assert(moderatorAuth);

  // 2. Create discussion board category as admin or via admin access
  const categoryCreateBody = {
    name: `Category_${RandomGenerator.alphaNumeric(5)}`,
    description: "Category for discussion topics",
  } satisfies IDiscussionBoardDiscussionBoardCategory.ICreate;

  // Since only admin can create categories, need admin join and authenticate
  const adminCreateBody = {
    email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "Admin1234",
    displayName: RandomGenerator.name(2),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminAuth: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(adminAuth);

  // Admin login
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminCreateBody.email,
      password: adminCreateBody.password,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });

  const category: IDiscussionBoardDiscussionBoardCategory =
    await api.functional.discussionBoard.admin.discussionBoardCategories.create(
      connection,
      { body: categoryCreateBody },
    );
  typia.assert(category);

  // Switch back to member
  const memberCreateBody = {
    email: `member_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "Member1234",
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const memberAuth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateBody,
    });
  typia.assert(memberAuth);

  // Member login
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberCreateBody.email,
      password: memberCreateBody.password,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // 4. Create a discussion board post by member
  const postCreateBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 6 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
    post_status: "public",
  } satisfies IDiscussionBoardDiscussionBoardPost.ICreate;

  const post: IDiscussionBoardDiscussionBoardPost =
    await api.functional.discussionBoard.member.discussionBoardPosts.create(
      connection,
      { body: postCreateBody },
    );
  typia.assert(post);

  // 5. Create a reply to the post by the member
  const replyCreateBody = {
    post_id: post.id,
    member_id: memberAuth.id,
    content: RandomGenerator.paragraph({ sentences: 4 }),
    reply_status: "public",
  } satisfies IDiscussionBoardDiscussionBoardReply.ICreate;

  const reply: IDiscussionBoardDiscussionBoardReply =
    await api.functional.discussionBoard.member.discussionBoardPosts.discussionBoardReplies.postByDiscussionboardpostid(
      connection,
      {
        discussionBoardPostId: post.id,
        body: replyCreateBody,
      },
    );
  typia.assert(reply);

  // 6. Authenticate as moderator again to ensure token is fresh
  await api.functional.auth.moderator.login.loginModerator(connection, {
    body: {
      email: moderatorCreateBody.email,
      password: moderatorCreateBody.password,
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // 7. Delete the reply as moderator
  await api.functional.discussionBoard.moderator.discussionBoardPosts.discussionBoardReplies.eraseByDiscussionboardpostidAndDiscussionboardreplyid(
    connection,
    {
      discussionBoardPostId: post.id,
      discussionBoardReplyId: reply.id,
    },
  );

  // Since response is void, no direct assertion on response

  // 8. Try deleting again should fail - test unauthorized deletion behavior
  await TestValidator.error(
    "Deleting non-existent or already deleted reply should fail",
    async () => {
      await api.functional.discussionBoard.moderator.discussionBoardPosts.discussionBoardReplies.eraseByDiscussionboardpostidAndDiscussionboardreplyid(
        connection,
        {
          discussionBoardPostId: post.id,
          discussionBoardReplyId: reply.id,
        },
      );
    },
  );
}
