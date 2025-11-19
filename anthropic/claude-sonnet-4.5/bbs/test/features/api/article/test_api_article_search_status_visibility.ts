import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test article visibility filtering with proper authorization rules based on
 * publication status.
 *
 * This test validates that the article search API correctly enforces visibility
 * rules:
 *
 * - Published articles are visible to all users (guests, members, moderators)
 * - Draft articles are visible only to their authors and moderators
 *
 * The test creates articles in different states and verifies search results for
 * different user contexts to ensure proper content access control.
 *
 * Note: Archived status testing is not included as the article creation API
 * only supports "draft" and "published" status values during creation.
 *
 * Test Steps:
 *
 * 1. Create moderator account and article category
 * 2. Create member account (article author)
 * 3. Create articles in different states (published, draft)
 * 4. Test visibility as unauthenticated user (guest)
 * 5. Test visibility as author (should see own drafts)
 * 6. Test visibility as different member (should not see other's drafts)
 * 7. Test visibility as moderator (should see all)
 */
export async function test_api_article_search_status_visibility(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(2),
      href: "https://test.example.com/moderator/join",
      referrer: "https://test.example.com/home",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create article category
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Test Category",
          slug: "test-category",
          description: "Category for testing article visibility",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account (article author)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "member123",
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(2),
      href: "https://test.example.com/member/join",
      referrer: "https://test.example.com/home",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create articles in different states
  const publishedArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: "Published Article - Visible to All",
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(publishedArticle);

  const draftArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: "Draft Article - Author and Moderator Only",
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
        discussion_board_article_category_id: category.id,
        status: "draft",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(draftArticle);

  // Step 5: Test as unauthenticated connection (guest user)
  const guestConnection: api.IConnection = { ...connection, headers: {} };

  const guestResults = await api.functional.discussionBoard.articles.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(guestResults);

  // Guest should only see published articles
  const guestArticleIds = guestResults.data.map((a) => a.id);
  TestValidator.predicate(
    "guest can see published article",
    guestArticleIds.includes(publishedArticle.id),
  );
  TestValidator.predicate(
    "guest cannot see draft article",
    !guestArticleIds.includes(draftArticle.id),
  );

  // Step 6: Test as author (should see own drafts and published)
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "member123",
      href: "https://test.example.com/member/login",
      referrer: "https://test.example.com/home",
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const authorResults = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(authorResults);

  const authorArticleIds = authorResults.data.map((a) => a.id);
  TestValidator.predicate(
    "author can see published article",
    authorArticleIds.includes(publishedArticle.id),
  );
  TestValidator.predicate(
    "author can see own draft article",
    authorArticleIds.includes(draftArticle.id),
  );

  // Step 7: Test as different member (should not see other's drafts)
  const otherMemberEmail = typia.random<string & tags.Format<"email">>();
  const otherMember = await api.functional.auth.member.join(connection, {
    body: {
      email: otherMemberEmail,
      password: "member456",
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(2),
      href: "https://test.example.com/member/join",
      referrer: "https://test.example.com/home",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(otherMember);

  const otherMemberResults =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(otherMemberResults);

  const otherMemberArticleIds = otherMemberResults.data.map((a) => a.id);
  TestValidator.predicate(
    "other member can see published article",
    otherMemberArticleIds.includes(publishedArticle.id),
  );
  TestValidator.predicate(
    "other member cannot see draft article from different author",
    !otherMemberArticleIds.includes(draftArticle.id),
  );

  // Step 8: Test as moderator (should see all articles)
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      href: "https://test.example.com/moderator/login",
      referrer: "https://test.example.com/home",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  const moderatorResults = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(moderatorResults);

  const moderatorArticleIds = moderatorResults.data.map((a) => a.id);
  TestValidator.predicate(
    "moderator can see published article",
    moderatorArticleIds.includes(publishedArticle.id),
  );
  TestValidator.predicate(
    "moderator can see draft article",
    moderatorArticleIds.includes(draftArticle.id),
  );

  // Step 9: Test status filtering with explicit status parameter
  const publishedOnlyResults =
    await api.functional.discussionBoard.articles.index(guestConnection, {
      body: {
        page: 1,
        limit: 100,
        status: "published",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(publishedOnlyResults);

  const publishedOnlyIds = publishedOnlyResults.data.map((a) => a.id);
  TestValidator.predicate(
    "status filter for published returns published article",
    publishedOnlyIds.includes(publishedArticle.id),
  );
  TestValidator.predicate(
    "status filter for published excludes draft article",
    !publishedOnlyIds.includes(draftArticle.id),
  );
}
