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
 * Reply author member updates reply. Authenticate as member, create category,
 * post, reply, update reply content and status, authorize properly, validate
 * content length and profanity.
 */
export async function test_api_discussion_board_reply_update_by_member(
  connection: api.IConnection,
) {
  // 1. Member registration and login
  const memberEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const memberPassword = "Password123!";
  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;
  const memberAuthorized: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberJoinBody });
  typia.assert(memberAuthorized);

  // Member login to refresh token and set auth header
  const memberLoginBody = {
    email: memberEmail,
    password: memberPassword,
  } satisfies IDiscussionBoardMember.ILogin;
  await api.functional.auth.member.login(connection, {
    body: memberLoginBody,
  });

  // 2. Admin registration and login
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@admin.com`;
  const adminPassword = "AdminPassword123!";
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.name(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminAuthorized: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuthorized);

  // Admin login to refresh token and set auth header
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IDiscussionBoardAdmin.ILogin;
  await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });

  // 3. Admin creates a discussion board category (e.g., "Economic")
  const categoryCreateBody = {
    name: "Economic",
    description: "Economic related discussion",
  } satisfies IDiscussionBoardDiscussionBoardCategory.ICreate;
  const category: IDiscussionBoardDiscussionBoardCategory =
    await api.functional.discussionBoard.admin.discussionBoardCategories.create(
      connection,
      { body: categoryCreateBody },
    );
  typia.assert(category);

  // Switch back to member auth
  await api.functional.auth.member.login(connection, {
    body: memberLoginBody,
  });

  // 4. Member creates a discussion board post
  const postCreateBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 5, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
    post_status: "public",
  } satisfies IDiscussionBoardDiscussionBoardPost.ICreate;
  const post: IDiscussionBoardDiscussionBoardPost =
    await api.functional.discussionBoard.member.discussionBoardPosts.create(
      connection,
      { body: postCreateBody },
    );
  typia.assert(post);

  // 5. Member posts a reply to the post
  const replyCreateBody = {
    post_id: post.id,
    member_id: memberAuthorized.id,
    content: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
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

  // 6. Member updates the reply (valid content and status)
  const replyUpdateBody = {
    content: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 5,
      wordMax: 12,
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
    "reply ID should remain unchanged",
    updatedReply.id,
    reply.id,
  );
  TestValidator.equals(
    "reply content updated correctly",
    updatedReply.content,
    replyUpdateBody.content,
  );
  TestValidator.equals(
    "reply status updated correctly",
    updatedReply.reply_status,
    replyUpdateBody.reply_status,
  );
  TestValidator.equals(
    "reply's post_id remains same",
    updatedReply.post_id,
    post.id,
  );
  TestValidator.equals(
    "reply's member_id remains same",
    updatedReply.member_id,
    memberAuthorized.id,
  );

  // 7. Negative test: reply content too short (less than 5 characters)
  const invalidContentTooShort = "1234"; // 4 chars, invalid
  await TestValidator.error(
    "reply update should fail for content less than 5 chars",
    async () => {
      await api.functional.discussionBoard.member.discussionBoardPosts.discussionBoardReplies.putByDiscussionboardpostidAndDiscussionboardreplyid(
        connection,
        {
          discussionBoardPostId: post.id,
          discussionBoardReplyId: reply.id,
          body: {
            content: invalidContentTooShort,
            reply_status: "public",
          } satisfies IDiscussionBoardDiscussionBoardReply.IUpdate,
        },
      );
    },
  );

  // 8. Negative test: unauthorized update - another member tries to update this reply
  // Register and login as another member
  const otherMemberEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const otherMemberPassword = "OtherPass123!";
  const otherMemberJoinBody = {
    email: otherMemberEmail,
    password: otherMemberPassword,
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;
  const otherMemberAuthorized: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: otherMemberJoinBody,
    });
  typia.assert(otherMemberAuthorized);

  // Other member logs in
  const otherMemberLoginBody = {
    email: otherMemberEmail,
    password: otherMemberPassword,
  } satisfies IDiscussionBoardMember.ILogin;
  await api.functional.auth.member.login(connection, {
    body: otherMemberLoginBody,
  });

  // Attempt to update the reply by another member - should fail
  const maliciousUpdateBody = {
    content: "Trying... to hack reply content update",
    reply_status: "public",
  } satisfies IDiscussionBoardDiscussionBoardReply.IUpdate;
  await TestValidator.error(
    "unauthorized member should not update other's reply",
    async () => {
      await api.functional.discussionBoard.member.discussionBoardPosts.discussionBoardReplies.putByDiscussionboardpostidAndDiscussionboardreplyid(
        connection,
        {
          discussionBoardPostId: post.id,
          discussionBoardReplyId: reply.id,
          body: maliciousUpdateBody,
        },
      );
    },
  );
}
