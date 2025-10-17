import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardCategory";
import type { IDiscussionBoardDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardPost";
import type { IDiscussionBoardDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardReply";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * This test function verifies that a moderator user can retrieve a specific
 * discussion board reply by post ID and reply ID.
 *
 * The test covers the complete workflow:
 *
 * 1. Moderator user registration and authentication.
 * 2. Creation of a discussion board category by admin operations.
 * 3. Member user registration and authentication.
 * 4. Creation of a discussion board post under the created category by the member.
 * 5. Creation of a reply to the post by the member.
 * 6. Retrieval of the specific reply using the moderator's authentication token.
 *
 * Each step validates the expected output and ensures correct data relations.
 * The final retrieval ensures the moderator's permissions allow viewing the
 * member's reply and the reply data is comprehensive and accurate.
 */
export async function test_api_discussion_board_reply_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // 1. Register a moderator user
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join.joinModerator(connection, {
      body: {
        email: moderatorEmail,
        password: "ModPass123!",
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create a discussion board category
  const categoryName = RandomGenerator.pick(["Economic", "Political"] as const);
  const categoryDescription =
    categoryName === "Economic"
      ? "Posts related to economic discussions"
      : "Posts related to political discussions";
  const category: IDiscussionBoardDiscussionBoardCategory =
    await api.functional.discussionBoard.admin.discussionBoardCategories.create(
      connection,
      {
        body: {
          name: categoryName,
          description: categoryDescription,
        } satisfies IDiscussionBoardDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Register a member user
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemPass123!",
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 4. Create a discussion board post as member user
  const postTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const postBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 15,
  });
  const postStatus = "public"; // per domain permissions and typical usage
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

  // 5. Create a reply as member user for the post
  const replyContent = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 15,
  });
  const replyStatus = "public";
  const reply: IDiscussionBoardDiscussionBoardReply =
    await api.functional.discussionBoard.member.discussionBoardPosts.discussionBoardReplies.postByPostid(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          member_id: member.id,
          content: replyContent,
          reply_status: replyStatus,
        } satisfies IDiscussionBoardDiscussionBoardReply.ICreate,
      },
    );
  typia.assert(reply);

  // 6. Retrieve the reply as moderator user
  const retreivedReply: IDiscussionBoardDiscussionBoardReply =
    await api.functional.discussionBoard.moderator.discussionBoardPosts.discussionBoardReplies.getByPostidAndReplyid(
      connection,
      {
        postId: post.id,
        replyId: reply.id,
      },
    );
  typia.assert(retreivedReply);

  // Validate the reply matches the created reply
  TestValidator.equals("reply id", retreivedReply.id, reply.id);
  TestValidator.equals("post id", retreivedReply.post_id, post.id);
  TestValidator.equals("member id", retreivedReply.member_id, member.id);
  TestValidator.equals("reply content", retreivedReply.content, replyContent);
  TestValidator.equals(
    "reply status",
    retreivedReply.reply_status,
    replyStatus,
  );
  TestValidator.predicate(
    "reply timestamps are valid",
    retreivedReply.created_at !== null && retreivedReply.updated_at !== null,
  );
}
