import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticlesMonthlyStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticlesMonthlyStatistics";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

export async function test_api_statistics_articles_by_month(
  connection: api.IConnection,
) {
  /**
   * Validate monthly article statistics aggregation for the current month.
   *
   * Strategy:
   *
   * 1. Register a new member and rely on the SDK to attach the access token to the
   *    connection for authenticated requests.
   * 2. Create one published article and one draft article as the authenticated
   *    member. The server controls published_at; drafts are bucketed by
   *    created_at. Because the test environment may contain other data, we
   *    assert counts are at least the number created by this test rather than
   *    exact equality.
   */

  // 1) Member registration
  const username = RandomGenerator.alphaNumeric(8);
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Passw0rd!234"; // 12 chars, includes upper/lower/number/symbol
  const joinBody = {
    username,
    email,
    password,
    href: "http://example.com/welcome",
    referrer: "http://example.com/",
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBody });
  typia.assert(member);

  // 2) Create a published article
  const publishedBody = {
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 4, wordMax: 8 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
    state: "published",
  } satisfies IDiscussionBoardArticle.ICreate;

  const published: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: publishedBody,
    });
  typia.assert(published);

  // 3) Create a draft article
  const draftBody = {
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 4, wordMax: 8 }),
    content: RandomGenerator.content({ paragraphs: 1 }),
    state: "draft",
  } satisfies IDiscussionBoardArticle.ICreate;

  const draft: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: draftBody,
    });
  typia.assert(draft);

  // Track how many we created of each type for comparison (local counters)
  const createdPublishedCount = 1;
  const createdDraftCount = 1;

  // 4) Retrieve monthly statistics
  const stats: IDiscussionBoardArticlesMonthlyStatistics =
    await api.functional.discussionBoard.statistics.articles_by_month.articlesByMonth(
      connection,
    );
  typia.assert(stats);

  // 5) Validations
  TestValidator.predicate(
    "published_count should be at least the number of published articles created",
    stats.published_count >= createdPublishedCount,
  );

  TestValidator.predicate(
    "draft_count should be at least the number of drafts created",
    stats.draft_count >= createdDraftCount,
  );

  TestValidator.predicate(
    "distinct_authors_published should be at least 1",
    stats.distinct_authors_published >= 1,
  );

  // average_published_per_author ≈ published_count / max(distinct_authors_published, 1)
  TestValidator.predicate(
    "average_published_per_author should equal published_count / max(distinct_authors_published,1)",
    Math.abs(
      stats.average_published_per_author -
        stats.published_count / Math.max(stats.distinct_authors_published, 1),
    ) < 1e-8,
  );

  // month must be canonical month-start ISO 8601 timestamp (e.g., 2025-10-01T00:00:00Z)
  TestValidator.predicate(
    "month must be an ISO 8601 month-start timestamp",
    /^\d{4}-\d{2}-01T00:00:00Z$/.test(stats.month),
  );
}
