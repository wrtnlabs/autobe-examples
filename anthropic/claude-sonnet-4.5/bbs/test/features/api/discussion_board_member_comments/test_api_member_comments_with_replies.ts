import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";

/**
 * Test retrieving both top-level comments and reply comments authored by a
 * member.
 *
 * This test validates the complete workflow of member comment retrieval
 * including:
 *
 * 1. Member account creation and authentication
 * 2. Category and article creation for comment context
 * 3. Posting a top-level comment on the article
 * 4. Posting a reply comment to the top-level comment
 * 5. Retrieving all comments authored by the member
 * 6. Verifying both comments are included in the response
 *
 * The test ensures the single-level threading model is properly represented in
 * the member's comment history retrieval.
 */
export async function test_api_member_comments_with_replies(
  connection: api.IConnection,
) {
  // Step 1: Create a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = RandomGenerator.alphaNumeric(12);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // Step 2: Create a category (requires moderator permissions)
  const moderatorConnection: api.IConnection = { ...connection };

  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create an article as the member
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 4: Post a top-level comment on the article
  const topLevelCommentContent = RandomGenerator.paragraph({ sentences: 5 });
  const topLevelComment =
    await api.functional.discussionBoard.articles.comments.create(connection, {
      articleId: article.id,
      body: {
        discussion_board_article_id: article.id,
        discussion_board_parent_comment_id: null,
        content: topLevelCommentContent,
      } satisfies IDiscussionBoardComment.ICreate,
    });
  typia.assert(topLevelComment);

  // Step 5: Post a reply to the top-level comment
  const replyCommentContent = RandomGenerator.paragraph({ sentences: 4 });
  const replyComment =
    await api.functional.discussionBoard.articles.comments.create(connection, {
      articleId: article.id,
      body: {
        discussion_board_article_id: article.id,
        discussion_board_parent_comment_id: topLevelComment.id,
        content: replyCommentContent,
      } satisfies IDiscussionBoardComment.ICreate,
    });
  typia.assert(replyComment);

  // Step 6: Retrieve all comments by the member
  const memberComments =
    await api.functional.discussionBoard.members.comments.index(connection, {
      memberUsername: member.username,
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(memberComments);

  // Step 7: Verify both comments are in the response
  TestValidator.equals(
    "member comments should contain exactly 2 comments",
    memberComments.data.length,
    2,
  );

  // Verify the top-level comment is included
  const foundTopLevel = memberComments.data.find(
    (c) => c.id === topLevelComment.id,
  );
  TestValidator.predicate(
    "top-level comment should be in member comments",
    foundTopLevel !== undefined,
  );

  // Verify the reply comment is included
  const foundReply = memberComments.data.find((c) => c.id === replyComment.id);
  TestValidator.predicate(
    "reply comment should be in member comments",
    foundReply !== undefined,
  );

  // Verify the content matches
  if (foundTopLevel) {
    TestValidator.equals(
      "top-level comment content matches",
      foundTopLevel.content,
      topLevelCommentContent,
    );
  }

  if (foundReply) {
    TestValidator.equals(
      "reply comment content matches",
      replyComment.content,
      replyCommentContent,
    );
  }
}
