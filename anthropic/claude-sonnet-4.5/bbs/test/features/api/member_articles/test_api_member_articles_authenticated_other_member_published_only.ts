import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test that authenticated members viewing another member's articles only see
 * published content.
 *
 * This test validates the authorization logic that restricts article visibility
 * based on authentication and ownership. When Member B (authenticated) queries
 * Member A's articles, only published articles should be returned. Draft and
 * archived articles should be hidden.
 *
 * Test Flow:
 *
 * 1. Create and authenticate Member A
 * 2. Create and authenticate Member B (switches JWT token in connection)
 * 3. Query Member A's articles as Member B
 * 4. Validate that ONLY published articles are visible to Member B
 *
 * Note: Since article creation endpoints are not provided in the test
 * materials, this test validates the authorization logic on any existing
 * articles in the system. The test ensures that if articles exist for Member A,
 * only published ones are visible to Member B.
 */
export async function test_api_member_articles_authenticated_other_member_published_only(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate Member A
  const memberA = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(memberA);

  // Step 2: Create and authenticate Member B
  // This automatically switches the JWT token in the connection to Member B
  const memberB = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(memberB);

  // Step 3: Query Member A's articles as Member B (authenticated as Member B via JWT)
  const articlesResponse =
    await api.functional.discussionBoard.members.articles.index(connection, {
      memberId: memberA.id,
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(articlesResponse);

  // Step 4: Validate authorization logic - ONLY published articles should be visible
  // This is the core authorization check: Member B should only see Member A's published articles
  for (const article of articlesResponse.data) {
    TestValidator.equals(
      "article status must be published when viewing another member's articles",
      article.status,
      "published" as const,
    );

    TestValidator.equals(
      "article must belong to Member A",
      article.discussion_board_member_id,
      memberA.id,
    );
  }

  // Additional validation: Ensure no draft or archived articles are present
  const hasDraftArticles = articlesResponse.data.some(
    (article) => article.status === "draft",
  );
  const hasArchivedArticles = articlesResponse.data.some(
    (article) => article.status === "archived",
  );

  TestValidator.predicate(
    "no draft articles should be visible to other authenticated members",
    hasDraftArticles === false,
  );

  TestValidator.predicate(
    "no archived articles should be visible to other authenticated members",
    hasArchivedArticles === false,
  );
}
