import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test filtering articles by specific author (member ID) to retrieve all
 * articles written by a particular discussion board member.
 *
 * This test validates the discussion_board_member_id filtering capability by:
 *
 * 1. Creating two different member accounts (Member A and Member B)
 * 2. Having each member publish several articles
 * 3. Filtering by Member A's ID to verify only their articles are returned
 * 4. Ensuring filtered results maintain proper pagination
 * 5. Verifying correct author information is included in article summaries
 *
 * This functionality is essential for member profile pages and browsing all
 * contributions from a specific author on the discussion board.
 */
export async function test_api_article_filter_by_author(
  connection: api.IConnection,
) {
  // Step 1: Create first member account (Member A)
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAData = {
    email: memberAEmail,
    password: "password123",
    username: RandomGenerator.name(2),
    href: "https://example.com/register",
    referrer: "https://example.com/home",
  } satisfies IDiscussionBoardMember.ICreate;

  const memberA: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberAData,
    });
  typia.assert(memberA);

  // Step 2: Member A creates multiple articles (4 articles)
  const memberAArticles: IDiscussionBoardArticle[] =
    await ArrayUtil.asyncRepeat(4, async () => {
      const article = await api.functional.discussionBoard.articles.create(
        connection,
        {
          body: {
            title: RandomGenerator.paragraph({
              sentences: 3,
              wordMin: 3,
              wordMax: 7,
            }),
            body: RandomGenerator.content({
              paragraphs: 2,
              sentenceMin: 10,
              sentenceMax: 15,
            }),
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
      typia.assert(article);
      return article;
    });

  // Step 3: Create second member account (Member B)
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBData = {
    email: memberBEmail,
    password: "password456",
    username: RandomGenerator.name(2),
    href: "https://example.com/register",
    referrer: "https://example.com/home",
  } satisfies IDiscussionBoardMember.ICreate;

  const memberB: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberBData,
    });
  typia.assert(memberB);

  // Step 4: Member B creates multiple articles (3 articles)
  const memberBArticles: IDiscussionBoardArticle[] =
    await ArrayUtil.asyncRepeat(3, async () => {
      const article = await api.functional.discussionBoard.articles.create(
        connection,
        {
          body: {
            title: RandomGenerator.paragraph({
              sentences: 3,
              wordMin: 3,
              wordMax: 7,
            }),
            body: RandomGenerator.content({
              paragraphs: 2,
              sentenceMin: 10,
              sentenceMax: 15,
            }),
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
      typia.assert(article);
      return article;
    });

  // Step 5: Filter articles by Member A's ID
  const filteredResults: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        discussion_board_member_id: memberA.id,
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(filteredResults);

  // Step 6: Validate filtered results contain ONLY Member A's articles
  TestValidator.equals(
    "filtered article count matches Member A's article count",
    filteredResults.data.length,
    memberAArticles.length,
  );

  TestValidator.equals(
    "total records in pagination matches Member A's article count",
    filteredResults.pagination.records,
    memberAArticles.length,
  );

  // Step 7: Verify each filtered article belongs to Member A
  await ArrayUtil.asyncForEach(filteredResults.data, async (articleSummary) => {
    TestValidator.equals(
      "article author ID matches Member A ID",
      articleSummary.author.id,
      memberA.id,
    );

    TestValidator.equals(
      "article author username matches Member A username",
      articleSummary.author.username,
      memberA.username,
    );

    TestValidator.equals(
      "article author email matches Member A email",
      articleSummary.author.email,
      memberA.email,
    );
  });

  // Step 8: Verify Member B's articles are NOT in the filtered results
  const memberAArticleIds = memberAArticles.map((a) => a.id);
  const filteredArticleIds = filteredResults.data.map((a) => a.id);

  TestValidator.predicate(
    "all filtered article IDs are from Member A",
    filteredArticleIds.every((id) => memberAArticleIds.includes(id)),
  );

  // Step 9: Verify none of Member B's articles appear in filtered results
  const memberBArticleIds = memberBArticles.map((a) => a.id);
  TestValidator.predicate(
    "no Member B articles appear in filtered results",
    filteredArticleIds.every((id) => !memberBArticleIds.includes(id)),
  );

  // Step 10: Verify pagination metadata correctness
  TestValidator.equals(
    "pagination current page is 1",
    filteredResults.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit matches request",
    filteredResults.pagination.limit,
    20,
  );

  TestValidator.predicate(
    "pagination pages is calculated correctly",
    filteredResults.pagination.pages >= 1,
  );
}
