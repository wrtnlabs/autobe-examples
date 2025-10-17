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

/**
 * Tests the update of a discussion board reply by its member author.
 *
 * This function performs an end-to-end test covering member and admin user
 * authentication, category creation by admin, post creation by member, reply
 * creation, and subsequent reply update by the reply author (member). It
 * validates the update operation, enforces correct authorization, and checks
 * validation constraints on reply content and status.
 *
 * The test also validates that unauthorized users cannot update replies they do
 * not own, and that content length validations are properly enforced.
 *
 * The test follows a realistic scenario of multi-role interaction in a
 * discussion board environment.
 *
 * Process:
 *
 * 1. Member user registers and logs in.
 * 2. Admin user registers and logs in.
 * 3. Admin creates a discussion board category.
 * 4. Member creates a discussion board post in the category.
 * 5. Member creates a reply to the post.
 * 6. Member updates the reply.
 * 7. Verifies the reply update is reflected correctly.
 * 8. Another member attempts to update reply and fails.
 * 9. Replies with invalid content length are rejected.
 */
export async function test_api_discussion_board_reply_update_by_member(
  connection: api.IConnection,
) {
  // 1. Member user registration and auth
  const memberEmail1: string = typia.random<string & tags.Format<"email">>();
  const memberPassword1 = "Password123!";
  // Register member1
  const member1: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail1,
        password: memberPassword1,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member1);

  // 2. Another member user registration for unauthorized test
  const memberEmail2: string = typia.random<string & tags.Format<"email">>();
  const memberPassword2 = "Password123!";
  const member2: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail2,
        password: memberPassword2,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member2);

  // 3. Admin user registration and login
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        displayName: RandomGenerator.name(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // 4. Admin creates discussion board category
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });

  const categoryCreateBody = {
    name: RandomGenerator.pick(["Economic", "Political"] as const),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardDiscussionBoardCategory =
    await api.functional.discussionBoard.admin.discussionBoardCategories.create(
      connection,
      { body: categoryCreateBody },
    );
  typia.assert(category);

  // 5. Member1 login
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail1,
      password: memberPassword1,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // 6. Member1 creates a discussion board post
  const postCreateBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
    post_status: "public", // assumed enum exact
  } satisfies IDiscussionBoardDiscussionBoardPost.ICreate;

  const post: IDiscussionBoardDiscussionBoardPost =
    await api.functional.discussionBoard.member.discussionBoardPosts.create(
      connection,
      { body: postCreateBody },
    );
  typia.assert(post);

  // 7. Member1 creates a reply to the post
  const replyCreateBody = {
    post_id: post.id,
    member_id: member1.id,
    content: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 5,
      wordMax: 15,
    }),
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

  // 8. Member1 updates the reply
  const replyUpdateBody = {
    content: RandomGenerator.paragraph({
      sentences: 15,
      wordMin: 5,
      wordMax: 20,
    }),
    reply_status: "public",
  } satisfies IDiscussionBoardDiscussionBoardReply.IUpdate;

  const updatedReply: IDiscussionBoardDiscussionBoardReply =
    await api.functional.discussionBoard.member.discussionBoardPosts.discussionBoardReplies.putByDiscussionboardpostidAndDiscussionboardreplyid(
      connection,
      {
        discussionBoardPostId: post.id,
        discussionBoardReplyId: reply.id,
        body: replyUpdateBody,
      },
    );
  typia.assert(updatedReply);

  TestValidator.equals(
    "reply content updated",
    updatedReply.content,
    replyUpdateBody.content,
  );

  // 9. Member2 login (unauthorized user)
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail2,
      password: memberPassword2,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // Attempt unauthorized update - expect error
  await TestValidator.error(
    "unauthorized member cannot update another's reply",
    async () => {
      await api.functional.discussionBoard.member.discussionBoardPosts.discussionBoardReplies.putByDiscussionboardpostidAndDiscussionboardreplyid(
        connection,
        {
          discussionBoardPostId: post.id,
          discussionBoardReplyId: reply.id,
          body: replyUpdateBody,
        },
      );
    },
  );

  // 10. Input validation - content too short (less than 5 chars) - expect error
  await TestValidator.error(
    "reply update with too short content should fail",
    async () => {
      await api.functional.discussionBoard.member.discussionBoardPosts.discussionBoardReplies.putByDiscussionboardpostidAndDiscussionboardreplyid(
        connection,
        {
          discussionBoardPostId: post.id,
          discussionBoardReplyId: reply.id,
          body: {
            content: "hey",
            reply_status: "public",
          } satisfies IDiscussionBoardDiscussionBoardReply.IUpdate,
        },
      );
    },
  );

  // 11. Input validation - content too long (over 1000 chars) - expect error
  const longContent =
    RandomGenerator.paragraph({ sentences: 200, wordMin: 10 }) +
    RandomGenerator.paragraph({ sentences: 200, wordMin: 10 });
  await TestValidator.error(
    "reply update with too long content should fail",
    async () => {
      await api.functional.discussionBoard.member.discussionBoardPosts.discussionBoardReplies.putByDiscussionboardpostidAndDiscussionboardreplyid(
        connection,
        {
          discussionBoardPostId: post.id,
          discussionBoardReplyId: reply.id,
          body: {
            content: longContent,
            reply_status: "public",
          } satisfies IDiscussionBoardDiscussionBoardReply.IUpdate,
        },
      );
    },
  );
}
