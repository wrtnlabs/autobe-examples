import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardCategory";
import type { IDiscussionBoardDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardPost";
import type { IDiscussionBoardDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardReply";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test member discussion board reply creation workflow.
 *
 * This E2E test covers the entire flow where a member user joins, creates a
 * discussion category, creates a discussion post, and finally adds a reply to
 * that post.
 *
 * Steps:
 *
 * 1. Register a new member and authenticate.
 * 2. Create a discussion board category as prerequisite.
 * 3. Create a discussion board post under the category by the member.
 * 4. Create a reply to the discussion post by the same member.
 * 5. Validate response data correctness, adherence to shape, and business logic
 *    like content length and timestamps.
 *
 * This test confirms the happy path of a member contributing replies to the
 * discussion board, verifying authorization, data integrity, and API endpoint
 * compliance.
 */
export async function test_api_discussion_board_reply_creation_by_member(
  connection: api.IConnection,
) {
  // 1. Member join and authenticate
  const memberInput = {
    email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
    password: "password123",
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberInput });
  typia.assert(member);

  // 2. Create a discussion board category (admin privilege assumed managed)
  // Assuming admin can create category with any given name
  const categoryInput = {
    name: `Category ${RandomGenerator.alphaNumeric(5)}`,
    description: "Unit test category for discussion board",
  } satisfies IDiscussionBoardDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardDiscussionBoardCategory =
    await api.functional.discussionBoard.admin.discussionBoardCategories.create(
      connection,
      { body: categoryInput },
    );
  typia.assert(category);

  // 3. Create a discussion board post by the authenticated member
  const postInput = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 8,
    }),
    post_status: "public",
  } satisfies IDiscussionBoardDiscussionBoardPost.ICreate;

  const post: IDiscussionBoardDiscussionBoardPost =
    await api.functional.discussionBoard.member.discussionBoardPosts.create(
      connection,
      { body: postInput },
    );
  typia.assert(post);

  TestValidator.equals(
    "post.category_id equals category.id",
    post.category_id,
    category.id,
  );
  TestValidator.equals(
    "post.title matches postInput.title",
    post.title,
    postInput.title,
  );
  TestValidator.equals(
    "post.body matches postInput.body",
    post.body,
    postInput.body,
  );
  TestValidator.equals(
    "post.post_status is 'public'",
    post.post_status,
    "public",
  );
  TestValidator.predicate(
    "post.created_at is valid ISO date",
    !isNaN(Date.parse(post.created_at)),
  );

  // 4. Create a reply under the newly created post by the member
  const replyInput = {
    post_id: post.id,
    member_id: member.id,
    content: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 4,
      wordMax: 9,
    }),
    reply_status: "public",
  } satisfies IDiscussionBoardDiscussionBoardReply.ICreate;

  const reply: IDiscussionBoardDiscussionBoardReply =
    await api.functional.discussionBoard.member.discussionBoardPosts.discussionBoardReplies.postByPostid(
      connection,
      {
        postId: post.id,
        body: replyInput,
      },
    );
  typia.assert(reply);

  // Validate reply properties
  TestValidator.equals("reply.post_id matches post.id", reply.post_id, post.id);
  TestValidator.equals(
    "reply.member_id matches member.id",
    reply.member_id,
    member.id,
  );
  TestValidator.equals(
    "reply.content matches input content",
    reply.content,
    replyInput.content,
  );
  TestValidator.equals(
    "reply.reply_status is 'public'",
    reply.reply_status,
    "public",
  );
  TestValidator.predicate(
    "reply.created_at is valid ISO date",
    !isNaN(Date.parse(reply.created_at)),
  );
  TestValidator.predicate(
    "reply.updated_at is valid ISO date",
    !isNaN(Date.parse(reply.updated_at)),
  );
}
