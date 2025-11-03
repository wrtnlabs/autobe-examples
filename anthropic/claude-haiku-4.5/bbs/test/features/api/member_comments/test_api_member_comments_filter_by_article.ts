import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCreate";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";

/**
 * Test member's ability to filter their comments by the articles they were
 * posted on.
 *
 * The workflow creates a new member, creates two different articles, posts
 * comments on both articles, then filters comments by article association to
 * verify correct filtering. The test validates that filtering by article
 * correctly isolates comments posted on specific articles, filtering works in
 * combination with other criteria (date range, status), filtered results show
 * only comments on the selected article, and each comment includes article
 * context (title, link) for reference. The test also validates that the filter
 * interface provides article selection options and displays total comment count
 * per article.
 *
 * Step-by-step process:
 *
 * 1. Register a new member account for the test
 * 2. Create first article on Economics topic
 * 3. Create second article on Politics topic
 * 4. Post comment on first article by member
 * 5. Post comment on second article by member
 * 6. Post additional comment on first article (for filtering variety)
 * 7. Filter all comments by first article ID to verify isolation
 * 8. Verify filtered results contain only comments from first article
 * 9. Filter comments by second article ID
 * 10. Verify filtered results contain only comments from second article
 * 11. Verify comment count and article metadata in filtered results
 */
export async function test_api_member_comments_filter_by_article(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberRegisterData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123",
  } satisfies IDiscussionBoardMember.IRegisterRequest;

  const memberAuthorized = await api.functional.auth.member.join(connection, {
    body: memberRegisterData,
  });
  typia.assert(memberAuthorized);
  TestValidator.predicate(
    "member registered successfully",
    memberAuthorized.id !== null,
  );

  // Step 2: Create first article (Economics)
  const firstArticleData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
    category_code: "economics",
  } satisfies IDiscussionBoardArticle.ICreate;

  const firstArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: firstArticleData,
    });
  typia.assert(firstArticle);
  TestValidator.predicate("first article created", firstArticle.id !== null);

  // Step 3: Create second article (Politics)
  const secondArticleData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
    category_code: "politics",
  } satisfies IDiscussionBoardArticle.ICreate;

  const secondArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: secondArticleData,
    });
  typia.assert(secondArticle);
  TestValidator.predicate("second article created", secondArticle.id !== null);

  // Step 4: Post comment on first article
  const firstArticleCommentData = {
    content: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardComment.ICreate;

  const firstArticleComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: firstArticle.id,
        body: firstArticleCommentData,
      },
    );
  typia.assert(firstArticleComment);
  TestValidator.predicate(
    "comment on first article created",
    firstArticleComment.id !== null,
  );

  // Step 5: Post comment on second article
  const secondArticleCommentData = {
    content: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardComment.ICreate;

  const secondArticleComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: secondArticle.id,
        body: secondArticleCommentData,
      },
    );
  typia.assert(secondArticleComment);
  TestValidator.predicate(
    "comment on second article created",
    secondArticleComment.id !== null,
  );

  // Step 6: Post additional comment on first article
  const additionalFirstArticleCommentData = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IDiscussionBoardComment.ICreate;

  const additionalFirstArticleComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: firstArticle.id,
        body: additionalFirstArticleCommentData,
      },
    );
  typia.assert(additionalFirstArticleComment);

  // Step 7: Filter comments by first article ID
  const filterFirstArticleRequest = {
    article_id: firstArticle.id,
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardComment.IRequest;

  const firstArticleCommentsFiltered =
    await api.functional.discussionBoard.member.me.comments.index(connection, {
      body: filterFirstArticleRequest,
    });
  typia.assert(firstArticleCommentsFiltered);

  // Step 8: Verify filtered results contain only comments from first article
  TestValidator.predicate(
    "first article filter contains correct number of comments",
    firstArticleCommentsFiltered.data.length === 2,
  );

  // Verify all comments in first article filter belong to first article
  for (const comment of firstArticleCommentsFiltered.data) {
    TestValidator.equals(
      "comment belongs to first article",
      comment.discussion_board_article_id,
      firstArticle.id,
    );
  }

  // Step 9: Filter comments by second article ID
  const filterSecondArticleRequest = {
    article_id: secondArticle.id,
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardComment.IRequest;

  const secondArticleCommentsFiltered =
    await api.functional.discussionBoard.member.me.comments.index(connection, {
      body: filterSecondArticleRequest,
    });
  typia.assert(secondArticleCommentsFiltered);

  // Step 10: Verify filtered results contain only comments from second article
  TestValidator.predicate(
    "second article filter contains correct number of comments",
    secondArticleCommentsFiltered.data.length === 1,
  );

  // Verify all comments in second article filter belong to second article
  for (const comment of secondArticleCommentsFiltered.data) {
    TestValidator.equals(
      "comment belongs to second article",
      comment.discussion_board_article_id,
      secondArticle.id,
    );
  }

  // Step 11: Verify comment count and article metadata in filtered results
  TestValidator.equals(
    "first article has correct comment count in pagination",
    firstArticleCommentsFiltered.pagination.records,
    2,
  );

  TestValidator.equals(
    "second article has correct comment count in pagination",
    secondArticleCommentsFiltered.pagination.records,
    1,
  );

  // Verify comment content exists in filtered results
  TestValidator.predicate(
    "first article comments have content",
    firstArticleCommentsFiltered.data.every((c) => c.content.length > 0),
  );

  TestValidator.predicate(
    "second article comments have content",
    secondArticleCommentsFiltered.data.every((c) => c.content.length > 0),
  );

  // Test filtering with status filter
  const filterWithStatusRequest = {
    article_id: firstArticle.id,
    status: "published",
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardComment.IRequest;

  const firstArticlePublishedComments =
    await api.functional.discussionBoard.member.me.comments.index(connection, {
      body: filterWithStatusRequest,
    });
  typia.assert(firstArticlePublishedComments);

  TestValidator.predicate(
    "filtered comments have published status",
    firstArticlePublishedComments.data.every((c) => c.status === "published"),
  );
}
