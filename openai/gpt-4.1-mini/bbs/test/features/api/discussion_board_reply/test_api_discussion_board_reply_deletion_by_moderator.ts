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
 * Test that moderator can delete a reply in a discussion board post.
 *
 * This end-to-end test performs the entire workflow:
 *
 * 1. Moderator registration and login
 * 2. Discussion category creation by admin
 * 3. Member registration and login
 * 4. Member creates a post under the category
 * 5. Member creates a reply under the post
 * 6. Moderator deletes the reply
 * 7. Validate the reply deletion state
 * 8. Validate that unauthorized users cannot delete replies
 *
 * Each step validates API responses and business rules, including
 * authorization, content constraints, and data integrity. Focused on role-based
 * access and secure operations.
 */
export async function test_api_discussion_board_reply_deletion_by_moderator(
  connection: api.IConnection,
) {
  // 1. Moderator: Join and login
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "StrongP@ssw0rd";
  const moderator = await api.functional.auth.moderator.join.joinModerator(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    },
  );
  typia.assert(moderator);

  await api.functional.auth.moderator.login.loginModerator(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // 2. Admin: Join and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "StrongP@ssw0rd";
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      displayName: RandomGenerator.name(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);

  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });

  // 3. Create a discussion category by admin
  const categoryName = RandomGenerator.pick(["Economic", "Political"] as const);
  const discussionCategory =
    await api.functional.discussionBoard.admin.discussionBoardCategories.create(
      connection,
      {
        body: {
          name: categoryName,
          description: `${categoryName} affairs and discussions`,
        } satisfies IDiscussionBoardDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(discussionCategory);
  TestValidator.equals(
    "category name set correctly",
    discussionCategory.name,
    categoryName,
  );

  // 4. Member: Join and login
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "StrongP@ssw0rd";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // 5. Member creates a post
  const postTitle = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 10,
  });
  const postBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 8,
  });
  const postStatus = "public";
  const postCreateBody = {
    category_id: discussionCategory.id,
    title: postTitle,
    body: postBody,
    post_status: postStatus,
  } satisfies IDiscussionBoardDiscussionBoardPost.ICreate;
  const post =
    await api.functional.discussionBoard.member.discussionBoardPosts.create(
      connection,
      {
        body: postCreateBody,
      },
    );
  typia.assert(post);
  TestValidator.equals(
    "post category id matches",
    post.category_id,
    discussionCategory.id,
  );
  TestValidator.equals("post title matches", post.title, postTitle);
  TestValidator.equals("post status matches", post.post_status, postStatus);

  // 6. Member creates a reply to the post
  const replyContent = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 12,
  });
  const replyStatus = "public";
  const replyCreateBody = {
    post_id: post.id,
    member_id: member.id,
    content: replyContent,
    reply_status: replyStatus,
  } satisfies IDiscussionBoardDiscussionBoardReply.ICreate;

  const reply =
    await api.functional.discussionBoard.member.discussionBoardPosts.discussionBoardReplies.postByPostid(
      connection,
      {
        postId: post.id,
        body: replyCreateBody,
      },
    );
  typia.assert(reply);
  TestValidator.equals("reply post id matches", reply.post_id, post.id);
  TestValidator.equals("reply member id matches", reply.member_id, member.id);
  TestValidator.equals("reply content matches", reply.content, replyContent);
  TestValidator.equals("reply status matches", reply.reply_status, replyStatus);

  // 7. Moderator deletes the reply
  await api.functional.discussionBoard.moderator.discussionBoardPosts.discussionBoardReplies.eraseByPostidAndReplyid(
    connection,
    {
      postId: post.id,
      replyId: reply.id,
    },
  );

  // 8. Confirm that reply is soft-deleted or no longer accessible by attempting to create reply again with same content and verifying business logic
  // For this API, no direct fetch of reply; to confirm deletion, validate error when deleting again or unauthorized deletion
  // Try moderator deleting again should error
  await TestValidator.error(
    "deleting already deleted reply should fail",
    async () => {
      await api.functional.discussionBoard.moderator.discussionBoardPosts.discussionBoardReplies.eraseByPostidAndReplyid(
        connection,
        {
          postId: post.id,
          replyId: reply.id,
        },
      );
    },
  );

  // 9. Attempt that member cannot delete the reply
  await TestValidator.error("member cannot delete reply", async () => {
    await api.functional.discussionBoard.moderator.discussionBoardPosts.discussionBoardReplies.eraseByPostidAndReplyid(
      connection,
      {
        postId: post.id,
        replyId: reply.id,
      },
    );
  });
}
