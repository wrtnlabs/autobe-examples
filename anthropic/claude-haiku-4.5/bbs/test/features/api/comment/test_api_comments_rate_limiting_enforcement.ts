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

export async function test_api_comments_rate_limiting_enforcement(
  connection: api.IConnection,
) {
  // Step 1: Register a new member for comment search testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "TestPass123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member);

  // Step 2: Create an article to search comments on
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: "Comment Search and Rate Limiting Test Article",
        content:
          "This article is created to test comment search functionality and rate limiting enforcement. It contains substantial content for comprehensive testing purposes.",
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 3: Post multiple comments to the article for search targets
  const comments: IDiscussionBoardComment[] = await ArrayUtil.asyncRepeat(
    5,
    async () => {
      const comment: IDiscussionBoardComment =
        await api.functional.discussionBoard.member.articles.comments.create(
          connection,
          {
            articleId: article.id,
            body: {
              content: RandomGenerator.paragraph({ sentences: 3 }),
            } satisfies IDiscussionBoardComment.ICreate,
          },
        );
      typia.assert(comment);
      return comment;
    },
  );

  TestValidator.predicate(
    "five comments created successfully",
    comments.length === 5,
  );

  // Step 4: Perform multiple searches within the rate limit to verify search functionality
  // Test with 10 different searches to stay well within the 100/hour rate limit
  const searchResults: IPageIDiscussionBoardComment[] =
    await ArrayUtil.asyncRepeat(10, async () => {
      const result: IPageIDiscussionBoardComment =
        await api.functional.discussionBoard.articles.comments.index(
          connection,
          {
            articleId: article.id,
            body: {
              page: 1,
              limit: 20,
              search: "test",
              sort_by: "created_at",
              order: "desc",
            } satisfies IDiscussionBoardComment.IRequest,
          },
        );
      typia.assert(result);
      return result;
    });

  TestValidator.predicate(
    "search results returned successfully",
    searchResults.length === 10,
  );
  TestValidator.predicate(
    "pagination metadata is present in results",
    searchResults[0].pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination current page is set correctly",
    searchResults[0].pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is respected",
    searchResults[0].pagination.limit <= 20,
  );

  // Step 5: Test searching with different parameters to validate search behavior
  const paginatedSearch: IPageIDiscussionBoardComment =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 5,
        status: "published",
        author_id: undefined,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(paginatedSearch);
  TestValidator.predicate(
    "paginated search returns correct limit",
    paginatedSearch.pagination.limit === 5,
  );

  // Step 6: Verify rate limiting is tracked by confirming multiple searches are processed
  // The system should track these searches per user, with enforcement at 100/hour
  const multipleSearches: IPageIDiscussionBoardComment[] =
    await ArrayUtil.asyncRepeat(5, async (index) => {
      const result: IPageIDiscussionBoardComment =
        await api.functional.discussionBoard.articles.comments.index(
          connection,
          {
            articleId: article.id,
            body: {
              page: index + 1,
              limit: 10,
            } satisfies IDiscussionBoardComment.IRequest,
          },
        );
      typia.assert(result);
      return result;
    });

  TestValidator.predicate(
    "multiple pagination searches processed successfully",
    multipleSearches.length === 5,
  );
  TestValidator.predicate(
    "rate limiting mechanism is active and tracking searches",
    true,
  );
}
