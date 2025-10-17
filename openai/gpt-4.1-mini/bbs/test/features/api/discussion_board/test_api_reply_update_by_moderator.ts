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
 * Validate updating a reply by a moderator in the discussion board system.
 *
 * The workflow includes:
 *
 * 1. Admin user joins and logs in.
 * 2. Admin creates a discussion board category.
 * 3. Member user joins and logs in.
 * 4. Member creates a post under the created category.
 * 5. Member creates a reply on the created post.
 * 6. Moderator joins and logs in.
 * 7. Moderator updates the reply with valid content and status.
 * 8. Validations ensure each operation returns expected results.
 *
 * This test ensures cross-role operations work correctly, proper authorization
 * is handled, and updates respect business rules such as length and profanity
 * constraints.
 */
export async function test_api_reply_update_by_moderator(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "A1b2C3d4";
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        displayName: RandomGenerator.name(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Admin login to ensure token is refreshed
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });

  // 3. Admin creates a discussion board category
  const categoryName = RandomGenerator.pick(["Economic", "Political"] as const);
  const category: IDiscussionBoardDiscussionBoardCategory =
    await api.functional.discussionBoard.admin.discussionBoardCategories.create(
      connection,
      {
        body: {
          name: categoryName,
          description: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IDiscussionBoardDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);
  TestValidator.predicate(
    `created category name is valid (${categoryName})`,
    category.name === categoryName,
  );

  // 4. Member joins
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword = "M1n2B3p4";
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 5. Member login to ensure token is refreshed
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // 6. Member creates a discussion board post
  const postTitle = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });
  const postBody = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 10,
  });
  const postStatus = "public"; // Assuming possible values satisfy business rules
  const post: IDiscussionBoardDiscussionBoardPost =
    await api.functional.discussionBoard.member.discussionBoardPosts.create(
      connection,
      {
        body: {
          category_id: category.id,
          title: postTitle,
          body: postBody,
          post_status: postStatus,
        } satisfies IDiscussionBoardDiscussionBoardPost.ICreate,
      },
    );
  typia.assert(post);
  TestValidator.equals(
    "post category id matches",
    post.category_id,
    category.id,
  );

  // 7. Member creates a reply on the post
  const replyContent = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 5,
    wordMax: 10,
  });
  const replyStatus = "public"; // Assuming 'public' is a valid status
  const reply: IDiscussionBoardDiscussionBoardReply =
    await api.functional.discussionBoard.member.discussionBoardPosts.discussionBoardReplies.postByDiscussionboardpostid(
      connection,
      {
        discussionBoardPostId: post.id,
        body: {
          post_id: post.id,
          member_id: member.id,
          content: replyContent,
          reply_status: replyStatus,
        } satisfies IDiscussionBoardDiscussionBoardReply.ICreate,
      },
    );
  typia.assert(reply);
  TestValidator.equals("reply post id matches", reply.post_id, post.id);

  // 8. Moderator joins
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModP@ss123";
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join.joinModerator(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 9. Moderator login to switch context
  await api.functional.auth.moderator.login.loginModerator(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // 10. Moderator updates the reply
  const updatedContent = RandomGenerator.paragraph({
    sentences: 8,
    wordMin: 5,
    wordMax: 12,
  });
  const updatedStatus = "public";
  const updatedReply: IDiscussionBoardDiscussionBoardReply =
    await api.functional.discussionBoard.moderator.discussionBoardPosts.discussionBoardReplies.putByDiscussionboardpostidAndDiscussionboardreplyid(
      connection,
      {
        discussionBoardPostId: post.id,
        discussionBoardReplyId: reply.id,
        body: {
          content: updatedContent,
          reply_status: updatedStatus,
        } satisfies IDiscussionBoardDiscussionBoardReply.IUpdate,
      },
    );
  typia.assert(updatedReply);
  TestValidator.equals("updated reply id matches", updatedReply.id, reply.id);
  TestValidator.equals(
    "updated reply post id matches",
    updatedReply.post_id,
    post.id,
  );
  TestValidator.equals(
    "updated reply content reflects change",
    updatedReply.content,
    updatedContent,
  );
  TestValidator.equals(
    "updated reply status equals",
    updatedReply.reply_status,
    updatedStatus,
  );
}
