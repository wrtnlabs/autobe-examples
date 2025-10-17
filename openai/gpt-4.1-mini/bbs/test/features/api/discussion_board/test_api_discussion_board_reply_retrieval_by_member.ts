import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardCategory";
import type { IDiscussionBoardDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardPost";
import type { IDiscussionBoardDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardReply";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_discussion_board_reply_retrieval_by_member(
  connection: api.IConnection,
) {
  // 1. Register a new member user
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "password123";
  const memberDisplayName = RandomGenerator.name();

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: memberDisplayName,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a discussion board category
  const categoryBody = {
    name: RandomGenerator.pick(["Economic", "Political"] as const),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardDiscussionBoardCategory =
    await api.functional.discussionBoard.admin.discussionBoardCategories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  // 3. Create a discussion board post by the member
  const postBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 3, wordMax: 6 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    post_status: "public",
  } satisfies IDiscussionBoardDiscussionBoardPost.ICreate;

  const post: IDiscussionBoardDiscussionBoardPost =
    await api.functional.discussionBoard.member.discussionBoardPosts.create(
      connection,
      {
        body: postBody,
      },
    );
  typia.assert(post);
  TestValidator.equals(
    "Post category matches input",
    post.category_id,
    category.id,
  );
  TestValidator.equals("Post status is public", post.post_status, "public");

  // 4. Create a reply to the post by the member
  const replyBody = {
    post_id: post.id,
    member_id: member.id,
    content: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 7,
    }),
    reply_status: "public",
  } satisfies IDiscussionBoardDiscussionBoardReply.ICreate;

  const reply: IDiscussionBoardDiscussionBoardReply =
    await api.functional.discussionBoard.member.discussionBoardPosts.discussionBoardReplies.postByPostid(
      connection,
      {
        postId: post.id,
        body: replyBody,
      },
    );
  typia.assert(reply);
  TestValidator.equals(
    "Reply is linked to correct post",
    reply.post_id,
    post.id,
  );
  TestValidator.equals(
    "Reply is authored by member",
    reply.member_id,
    member.id,
  );
  TestValidator.equals("Reply status is public", reply.reply_status, "public");

  // 5. Retrieve the specific reply by postId and replyId
  const retrievedReply: IDiscussionBoardDiscussionBoardReply =
    await api.functional.discussionBoard.member.discussionBoardPosts.discussionBoardReplies.getByPostidAndReplyid(
      connection,
      {
        postId: post.id,
        replyId: reply.id,
      },
    );
  typia.assert(retrievedReply);

  // 6. Validate retrieved reply matches created reply
  TestValidator.equals(
    "Retrieved reply ID matches",
    retrievedReply.id,
    reply.id,
  );
  TestValidator.equals(
    "Retrieved reply content matches",
    retrievedReply.content,
    reply.content,
  );
  TestValidator.equals(
    "Retrieved reply status matches",
    retrievedReply.reply_status,
    reply.reply_status,
  );
  TestValidator.equals(
    "Retrieved reply post ID matches",
    retrievedReply.post_id,
    reply.post_id,
  );
  TestValidator.equals(
    "Retrieved reply member ID matches",
    retrievedReply.member_id,
    reply.member_id,
  );
}
