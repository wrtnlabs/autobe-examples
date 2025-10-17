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
 * Validates the complete process of posting a reply by a member to a discussion
 * board post.
 *
 * This test covers the multi-step workflow:
 *
 * 1. Admin user registration and login
 * 2. Admin creates a discussion board category
 * 3. Member user registration and login
 * 4. Member creates a discussion board post under the admin-created category
 * 5. Member posts a reply to that discussion board post
 *
 * Each step is verified for success with proper type assertions. Role switching
 * is handled via login API calls to simulate token changes. Replies are tested
 * for proper content length, linked post id, member id, and reply status.
 */
export async function test_api_discussion_board_reply_post_by_member(
  connection: api.IConnection,
) {
  // Step 1: Admin joins
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecureP@ssw0rd";
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.name(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // Step 2: Admin logs in (role switch)
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IDiscussionBoardAdmin.ILogin;
  const adminLogin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLogin);

  // Step 3: Admin creates discussion board category
  const categoryName = RandomGenerator.pick(["Economic", "Political"] as const);
  const categoryDescription = `Category for discussion on ${categoryName} topics`;
  const categoryCreateBody = {
    name: categoryName,
    description: categoryDescription,
  } satisfies IDiscussionBoardDiscussionBoardCategory.ICreate;
  const category: IDiscussionBoardDiscussionBoardCategory =
    await api.functional.discussionBoard.admin.discussionBoardCategories.create(
      connection,
      { body: categoryCreateBody },
    );
  typia.assert(category);

  // Step 4: Member joins
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberP@ss123";
  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberJoinBody });
  typia.assert(member);

  // Step 5: Member logs in (role switch)
  const memberLoginBody = {
    email: memberEmail,
    password: memberPassword,
  } satisfies IDiscussionBoardMember.ILogin;
  const memberLogin: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);

  // Step 6: Member creates a discussion board post under created category
  const postTitle = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 4,
    wordMax: 8,
  });
  const postBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 3,
    wordMax: 7,
  });
  const postStatus = "public";
  const postCreateBody = {
    category_id: category.id,
    title: postTitle,
    body: postBody,
    post_status: postStatus,
  } satisfies IDiscussionBoardDiscussionBoardPost.ICreate;
  const post: IDiscussionBoardDiscussionBoardPost =
    await api.functional.discussionBoard.member.discussionBoardPosts.create(
      connection,
      { body: postCreateBody },
    );
  typia.assert(post);

  // Step 7: Member posts a reply to the created post
  const replyContent = RandomGenerator.paragraph({
    sentences: 8,
    wordMin: 5,
    wordMax: 15,
  });
  const replyStatus = "public";
  const replyCreateBody = {
    post_id: post.id,
    member_id: member.id,
    content: replyContent,
    reply_status: replyStatus,
  } satisfies IDiscussionBoardDiscussionBoardReply.ICreate;
  const reply: IDiscussionBoardDiscussionBoardReply =
    await api.functional.discussionBoard.member.discussionBoardPosts.discussionBoardReplies.postByDiscussionboardpostid(
      connection,
      { discussionBoardPostId: post.id, body: replyCreateBody },
    );
  typia.assert(reply);

  // Assertions: Validate linkage between reply and post
  TestValidator.equals(
    "Reply post_id matches created post id",
    reply.post_id,
    post.id,
  );
  TestValidator.equals(
    "Reply member_id matches created member id",
    reply.member_id,
    member.id,
  );
  TestValidator.predicate(
    "Reply content length is within specified limits",
    reply.content.length >= 5 && reply.content.length <= 1000,
  );
  TestValidator.equals(
    "Reply status is 'public'",
    reply.reply_status,
    "public",
  );
}
