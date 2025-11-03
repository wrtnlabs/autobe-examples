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
 * Test retrieving a paginated list of comments posted by a specific member.
 *
 * This test validates the member comment retrieval functionality by creating a
 * member, establishing the required discussion board infrastructure (category
 * and articles), posting multiple comments under the member's authorship, and
 * then retrieving and validating the complete list of comments associated with
 * that member.
 *
 * Steps:
 *
 * 1. Register a new member account
 * 2. Create a discussion board category (requires moderator - using mock data)
 * 3. Create an article as the member
 * 4. Post multiple comments on the article
 * 5. Retrieve the member's comments by username
 * 6. Validate all comments are returned with correct metadata
 * 7. Verify pagination and sorting functionality
 */
export async function test_api_member_comments_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(12);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: "Test1234!@#$",
      href: "https://discussion-board.example.com/register" satisfies string &
        tags.Format<"uri">,
      referrer: "https://discussion-board.example.com/home" satisfies string &
        tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // Step 2: Create a category for articles (simulating moderator action)
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: `Category ${RandomGenerator.name(2)}`,
          description: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create an article as the member
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
          wordMin: 4,
          wordMax: 8,
        }),
        summary: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 4: Post multiple comments on the article
  const commentContents = ArrayUtil.repeat(
    5,
    (index) =>
      `Comment ${index + 1}: ${RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 12 })}`,
  );

  const createdComments = await ArrayUtil.asyncMap(
    commentContents,
    async (content) => {
      const comment =
        await api.functional.discussionBoard.articles.comments.create(
          connection,
          {
            articleId: article.id,
            body: {
              discussion_board_article_id: article.id,
              discussion_board_parent_comment_id: null,
              content: content,
            } satisfies IDiscussionBoardComment.ICreate,
          },
        );
      typia.assert(comment);
      return comment;
    },
  );

  // Step 5: Retrieve the member's comments by username
  const commentsPage =
    await api.functional.discussionBoard.members.comments.index(connection, {
      memberUsername: memberUsername,
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(commentsPage);

  // Step 6: Validate pagination metadata
  TestValidator.equals(
    "pagination current page should be 1",
    commentsPage.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit should be 10",
    commentsPage.pagination.limit,
    10,
  );

  TestValidator.equals(
    "total records should match created comments count",
    commentsPage.pagination.records,
    createdComments.length,
  );

  TestValidator.equals(
    "total pages should be 1",
    commentsPage.pagination.pages,
    1,
  );

  // Step 7: Validate all comments are present in the response
  TestValidator.equals(
    "returned comments count should match created comments count",
    commentsPage.data.length,
    createdComments.length,
  );

  // Step 8: Validate comment content and metadata
  for (const createdComment of createdComments) {
    const foundComment = commentsPage.data.find(
      (c) => c.id === createdComment.id,
    );

    TestValidator.predicate(
      "comment should be found in response",
      foundComment !== undefined,
    );

    if (foundComment) {
      typia.assertGuard(foundComment);

      TestValidator.equals(
        "comment content should match",
        foundComment.content,
        createdComment.content,
      );

      TestValidator.equals(
        "comment author type should be member",
        foundComment.author_type,
        "member",
      );

      TestValidator.predicate(
        "comment should have member author",
        foundComment.memberAuthor !== null,
      );

      if (foundComment.memberAuthor) {
        TestValidator.equals(
          "member author username should match",
          foundComment.memberAuthor.username,
          memberUsername,
        );
      }

      TestValidator.equals(
        "moderator author should be null for member comments",
        foundComment.moderatorAuthor,
        null,
      );
    }
  }

  // Step 9: Verify comments are sorted by creation date (newest first)
  for (let i = 0; i < commentsPage.data.length - 1; i++) {
    const currentComment = commentsPage.data[i];
    const nextComment = commentsPage.data[i + 1];

    const currentDate = new Date(currentComment.created_at);
    const nextDate = new Date(nextComment.created_at);

    TestValidator.predicate(
      "comments should be sorted by creation date descending",
      currentDate >= nextDate,
    );
  }
}
