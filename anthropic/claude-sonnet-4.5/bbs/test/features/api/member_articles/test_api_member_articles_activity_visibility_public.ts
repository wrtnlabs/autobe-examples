import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test that members with public activity visibility have their articles
 * accessible to all users including guests.
 *
 * This test validates the public activity visibility feature by creating a
 * member with public activity settings, creating several articles, and
 * verifying that unauthenticated guests can retrieve the member's article
 * list.
 *
 * Test Flow:
 *
 * 1. Create a member account with public activity_visibility
 * 2. Assume categories exist in the system (created by system setup)
 * 3. Create multiple articles under the member account
 * 4. Retrieve article list without authentication (as guest)
 * 5. Validate that articles are accessible and properly formatted
 */
export async function test_api_member_articles_activity_visibility_public(
  connection: api.IConnection,
) {
  // Step 1: Create member with public activity visibility
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(12);

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: RandomGenerator.alphaNumeric(12),
        href: "https://test.example.com/join" satisfies string &
          tags.Format<"uri">,
        referrer: "https://test.example.com" satisfies string &
          tags.Format<"uri">,
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member);

  // Verify member has public activity visibility
  TestValidator.predicate(
    "member activity visibility should be public",
    member.activity_visibility === "public",
  );

  // Step 2: Create multiple articles under the member account
  // Note: We'll attempt to create articles and handle category requirements
  // by using random UUIDs - the system will validate if categories exist
  const articleCount = 3;
  const createdArticles: IDiscussionBoardArticle[] = [];

  // Generate random category IDs (assuming categories exist in the system)
  const categoryId1 = typia.random<string & tags.Format<"uuid">>();
  const categoryId2 = typia.random<string & tags.Format<"uuid">>();

  for (let i = 0; i < articleCount; i++) {
    const article: IDiscussionBoardArticle =
      await api.functional.discussionBoard.member.articles.create(connection, {
        body: {
          title: `Article ${i + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
          body: RandomGenerator.content({ paragraphs: 3 }),
          summary: RandomGenerator.paragraph({ sentences: 3 }),
          category_ids: [categoryId1, categoryId2],
        } satisfies IDiscussionBoardArticle.ICreate,
      });
    typia.assert(article);
    createdArticles.push(article);
  }

  TestValidator.equals(
    "created article count should match expected",
    createdArticles.length,
    articleCount,
  );

  // Step 3: Retrieve article list without authentication (as guest)
  const guestConnection: api.IConnection = { ...connection, headers: {} };

  const articleListResponse: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.members.articles.index(
      guestConnection,
      {
        memberUsername: member.username,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(articleListResponse);

  // Step 4: Validate pagination structure
  TestValidator.predicate(
    "pagination current page should be 1",
    articleListResponse.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit should be 10",
    articleListResponse.pagination.limit === 10,
  );

  TestValidator.predicate(
    "pagination should show at least the created articles",
    articleListResponse.pagination.records >= articleCount,
  );

  // Step 5: Validate that articles appear in the response
  TestValidator.predicate(
    "article list should contain articles",
    articleListResponse.data.length >= articleCount,
  );

  // Step 6: Verify article summaries contain proper data
  const retrievedArticleIds = articleListResponse.data.map((a) => a.id);
  const createdArticleIds = createdArticles.map((a) => a.id);

  for (const createdId of createdArticleIds) {
    TestValidator.predicate(
      "created article should appear in guest-accessible list",
      retrievedArticleIds.includes(createdId),
    );
  }

  // Step 7: Verify article summary structure and author information
  for (const articleSummary of articleListResponse.data.slice(
    0,
    articleCount,
  )) {
    TestValidator.predicate(
      "article summary should have non-empty title",
      articleSummary.title.length > 0,
    );

    TestValidator.equals(
      "article author username should match member",
      articleSummary.author.username,
      member.username,
    );

    TestValidator.predicate(
      "article should have categories assigned",
      articleSummary.categories.length > 0,
    );

    TestValidator.predicate(
      "article status should be published",
      articleSummary.status === "published",
    );

    TestValidator.predicate(
      "article should have created timestamp",
      articleSummary.created_at.length > 0,
    );
  }

  // Step 8: Confirm guest access to public member articles
  TestValidator.predicate(
    "guest should successfully retrieve articles for member with public activity visibility",
    articleListResponse.data.length > 0,
  );
}
