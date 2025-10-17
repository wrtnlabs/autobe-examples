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

export async function test_api_discussion_board_reply_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "Password123!",
        displayName: RandomGenerator.name(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a discussion board category
  const categoryName = RandomGenerator.pick(["Economic", "Political"] as const);
  const category: IDiscussionBoardDiscussionBoardCategory =
    await api.functional.discussionBoard.admin.discussionBoardCategories.create(
      connection,
      {
        body: {
          name: categoryName,
          description: `A category about ${categoryName} topics`,
        } satisfies IDiscussionBoardDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Register a new member user
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "Password123!",
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 4. Create a discussion board post by the member
  const postCreateBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 5, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
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
    member_id: member.id,
    content: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 4,
      wordMax: 10,
    }),
    reply_status: "public",
  } satisfies IDiscussionBoardDiscussionBoardReply.ICreate;

  const reply: IDiscussionBoardDiscussionBoardReply =
    await api.functional.discussionBoard.member.discussionBoardPosts.discussionBoardReplies.postByPostid(
      connection,
      { postId: post.id, body: replyCreateBody },
    );
  typia.assert(reply);

  // 6. Switch authentication to admin user
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "Password123!",
      displayName: admin.display_name,
    } satisfies IDiscussionBoardAdmin.IJoin,
  });

  // 7. Retrieve the specific reply by postId and replyId using admin token
  const gotReply: IDiscussionBoardDiscussionBoardReply =
    await api.functional.discussionBoard.admin.discussionBoardPosts.discussionBoardReplies.getByPostidAndReplyid(
      connection,
      { postId: post.id, replyId: reply.id },
    );
  typia.assert(gotReply);

  // 8. Validate retrieved reply data matches what was posted
  TestValidator.equals(
    "retrieved reply id should match created",
    gotReply.id,
    reply.id,
  );

  TestValidator.equals(
    "retrieved reply post_id should match created post",
    gotReply.post_id,
    post.id,
  );

  TestValidator.equals(
    "retrieved reply member_id should match member who created reply",
    gotReply.member_id,
    member.id,
  );

  TestValidator.equals(
    "retrieved reply content should match created content",
    gotReply.content,
    reply.content,
  );

  TestValidator.equals(
    "retrieved reply reply_status should match created status",
    gotReply.reply_status,
    reply.reply_status,
  );
}
