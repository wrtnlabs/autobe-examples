import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test article visibility differences between guest and authenticated member
 * searches.
 *
 * Validates that guest users and authenticated members have appropriate access
 * to articles based on publication status. Published articles are visible to
 * all users, while archived and deleted articles remain hidden from
 * non-moderators.
 *
 * Test workflow:
 *
 * 1. Create a member account for authenticated access
 * 2. Create published articles with distinct content for search testing
 * 3. Search articles as a guest user (unauthenticated connection)
 * 4. Verify guest sees only published articles
 * 5. Authenticate the member and search articles
 * 6. Verify member sees the same published articles
 * 7. Validate article metadata and search accuracy
 */
export async function test_api_article_search_visibility_guest_vs_member(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authenticated testing
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const memberPassword = "TestPassword123";

  const memberAuth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(memberAuth);
  TestValidator.equals(
    "member created with authorization token",
    typeof memberAuth.token.access,
    "string",
  );

  // Step 2: Create published articles with searchable content
  // Article 1: Economics focused
  const article1: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: "Monetary Policy Impact on Markets",
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 15,
          wordMin: 4,
          wordMax: 8,
        }),
        category_code: "economics",
        attachments: undefined,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article1);
  TestValidator.equals(
    "article 1 status is published",
    article1.status,
    "published",
  );
  TestValidator.predicate(
    "article 1 has valid author",
    article1.author.id !== null,
  );

  // Article 2: Economics focused with different content
  const article2: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: "Trade Agreements and Economic Growth",
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 15,
          wordMin: 4,
          wordMax: 8,
        }),
        category_code: "economics",
        attachments: undefined,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article2);
  TestValidator.equals(
    "article 2 status is published",
    article2.status,
    "published",
  );

  // Article 3: Politics category
  const article3: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: "Political Systems and Governance",
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 15,
          wordMin: 4,
          wordMax: 8,
        }),
        category_code: "politics",
        attachments: undefined,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article3);
  TestValidator.equals(
    "article 3 status is published",
    article3.status,
    "published",
  );

  // Step 3: Test guest user search (create unauthenticated connection)
  const guestConnection: api.IConnection = { ...connection, headers: {} };

  // Guest searches for articles with keyword "Monetary"
  const guestSearchResult1: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(guestConnection, {
      body: {
        search: "Monetary",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(guestSearchResult1);
  TestValidator.predicate(
    "guest sees article 1 in search results",
    guestSearchResult1.data.some((a) => a.id === article1.id),
  );
  TestValidator.predicate(
    "guest search returns only published articles",
    guestSearchResult1.data.every((a) => a.status === "published"),
  );

  // Guest searches for articles with keyword "Trade"
  const guestSearchResult2: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(guestConnection, {
      body: {
        search: "Trade",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(guestSearchResult2);
  TestValidator.predicate(
    "guest sees article 2 in search results",
    guestSearchResult2.data.some((a) => a.id === article2.id),
  );

  // Guest searches by category filter
  const guestCategorySearch: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(guestConnection, {
      body: {
        category: "economics",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(guestCategorySearch);
  TestValidator.predicate(
    "guest sees article 1 in economics category",
    guestCategorySearch.data.some((a) => a.id === article1.id),
  );
  TestValidator.predicate(
    "guest sees article 2 in economics category",
    guestCategorySearch.data.some((a) => a.id === article2.id),
  );

  // Step 4: Verify member authentication and search with member connection
  // The connection now has the member's authorization token from earlier
  const memberSearchResult1: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        search: "Monetary",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(memberSearchResult1);
  TestValidator.predicate(
    "member sees article 1 in search results",
    memberSearchResult1.data.some((a) => a.id === article1.id),
  );
  TestValidator.predicate(
    "member search returns published articles",
    memberSearchResult1.data.every((a) => a.status === "published"),
  );

  // Member searches for articles across categories
  const memberAllArticlesSearch: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(memberAllArticlesSearch);
  TestValidator.predicate(
    "member sees all published articles",
    memberAllArticlesSearch.data.length >= 3,
  );

  // Step 5: Verify article metadata consistency
  const article1FromGuest = guestSearchResult1.data.find(
    (a) => a.id === article1.id,
  );
  const article1FromMember = memberSearchResult1.data.find(
    (a) => a.id === article1.id,
  );

  if (article1FromGuest && article1FromMember) {
    TestValidator.equals(
      "article 1 title consistent for guest and member",
      article1FromGuest.title,
      article1FromMember.title,
    );
    TestValidator.equals(
      "article 1 author same for guest and member",
      article1FromGuest.author.id,
      article1FromMember.author.id,
    );
  }

  // Step 6: Validate article has required fields in search results
  if (article1FromGuest) {
    TestValidator.predicate(
      "article 1 has creation timestamp",
      article1FromGuest.createdAt !== undefined,
    );
    TestValidator.predicate(
      "article 1 has view count",
      article1FromGuest.viewCount !== undefined,
    );
    TestValidator.predicate(
      "article 1 has comment count",
      article1FromGuest.commentCount !== undefined,
    );
    TestValidator.predicate(
      "article 1 has category",
      article1FromGuest.category !== undefined,
    );
  }

  // Step 7: Test pagination
  const paginatedSearch: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(guestConnection, {
      body: {
        page: 1,
        limit: 2,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(paginatedSearch);
  TestValidator.equals(
    "pagination current page is 1",
    paginatedSearch.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination respects limit",
    paginatedSearch.data.length <= 2,
  );
  TestValidator.predicate(
    "pagination has total records count",
    paginatedSearch.pagination.records !== undefined,
  );
}
