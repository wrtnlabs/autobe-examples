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
 * Test retrieval of a specific discussion board reply by admin users.
 *
 * This test covers the full lifecycle from admin user sign-up and login,
 * creating a discussion board category, a member user sign-up, post creation
 * under the category by member, replying to the post, then retrieving the
 * specific reply as an admin user. Authorization enforcement and data
 * consistency are validated.
 *
 * Steps:
 *
 * 1. Admin user joins and logs in
 * 2. Admin creates a discussion board category
 * 3. Member user joins and logs in
 * 4. Member creates a discussion board post under the category
 * 5. Member posts a reply to the post
 * 6. Admin logs in again (to ensure role switching)
 * 7. Admin retrieves the specific reply by post ID and reply ID
 * 8. Validation that retrieved reply matches created reply data
 */
export async function test_api_discussion_board_reply_get_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user sign-up
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "strongAdminPass123";
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.name(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Admin login
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });

  // 3. Admin creates discussion board category
  const categoryCreateBody = {
    name: `Category ${RandomGenerator.name()}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardDiscussionBoardCategory.ICreate;
  const category: IDiscussionBoardDiscussionBoardCategory =
    await api.functional.discussionBoard.admin.discussionBoardCategories.create(
      connection,
      { body: categoryCreateBody },
    );
  typia.assert(category);

  // 4. Member user sign-up
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "memberPass123";
  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberJoinBody });
  typia.assert(member);

  // 5. Member login
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // 6. Member creates discussion board post under the category
  const postCreateBody = {
    category_id: category.id,
    title: `Post Title ${RandomGenerator.paragraph({ sentences: 2 })}`,
    body: RandomGenerator.content({ paragraphs: 2 }),
    post_status: "public",
  } satisfies IDiscussionBoardDiscussionBoardPost.ICreate;
  const post: IDiscussionBoardDiscussionBoardPost =
    await api.functional.discussionBoard.member.discussionBoardPosts.create(
      connection,
      { body: postCreateBody },
    );
  typia.assert(post);

  // 7. Member posts a reply to the post
  const replyCreateBody = {
    post_id: post.id,
    member_id: member.id,
    content: RandomGenerator.paragraph({ sentences: 3 }),
    reply_status: "public",
  } satisfies IDiscussionBoardDiscussionBoardReply.ICreate;
  const reply: IDiscussionBoardDiscussionBoardReply =
    await api.functional.discussionBoard.member.discussionBoardPosts.discussionBoardReplies.postByDiscussionboardpostid(
      connection,
      { discussionBoardPostId: post.id, body: replyCreateBody },
    );
  typia.assert(reply);

  // 8. Admin logs in again to switch context
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });

  // 9. Admin retrieves the specific reply by post ID and reply ID
  const retrievedReply: IDiscussionBoardDiscussionBoardReply =
    await api.functional.discussionBoard.admin.discussionBoardPosts.discussionBoardReplies.getByDiscussionboardpostidAndDiscussionboardreplyid(
      connection,
      {
        discussionBoardPostId: post.id,
        discussionBoardReplyId: reply.id,
      },
    );
  typia.assert(retrievedReply);

  // 10. Validate that retrieved reply matches created reply
  TestValidator.equals(
    "Retrieve reply content equals created reply content",
    retrievedReply.content,
    reply.content,
  );
  TestValidator.equals(
    "Retrieve reply member_id equals created reply member_id",
    retrievedReply.member_id,
    reply.member_id,
  );
  TestValidator.equals(
    "Retrieve reply post_id equals created reply post_id",
    retrievedReply.post_id,
    reply.post_id,
  );
  TestValidator.equals(
    "Retrieve reply reply_status equals created reply reply_status",
    retrievedReply.reply_status,
    reply.reply_status,
  );
  TestValidator.predicate(
    "Retrieve reply created_at is valid date-time string",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.\d+)?Z$/.test(
      retrievedReply.created_at,
    ),
  );
  TestValidator.predicate(
    "Retrieve reply updated_at is valid date-time string",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.\d+)?Z$/.test(
      retrievedReply.updated_at,
    ),
  );
  TestValidator.predicate(
    "Retrieve reply deleted_at is null or date-time string",
    retrievedReply.deleted_at === null ||
      retrievedReply.deleted_at === undefined ||
      (typeof retrievedReply.deleted_at === "string" &&
        /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.\d+)?Z$/.test(
          retrievedReply.deleted_at,
        )),
  );
}
