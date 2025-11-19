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
 * Test various sorting options for article search functionality.
 *
 * This test validates that the article search API correctly handles different
 * sorting criteria including published_at, created_at, updated_at, and
 * view_count with both ascending and descending order. Creates multiple
 * articles with varied timestamps and engagement metrics to verify proper
 * ordering.
 *
 * Steps:
 *
 * 1. Create moderator account and article category
 * 2. Create member account to author test articles
 * 3. Create 5 published articles
 * 4. Test sort_by published_at DESC (newest first)
 * 5. Test sort_by view_count DESC (most popular first)
 * 6. Test sort_by updated_at DESC (recently modified)
 * 7. Test sort_by created_at ASC and DESC (chronological ordering)
 * 8. Verify results are correctly ordered for each sorting option
 */
export async function test_api_article_search_sorting_options(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123!",
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://test.example.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://test.example.com" satisfies string &
        tags.Format<"uri">,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create article category
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Test Category for Sorting",
          slug: "test-sorting-category",
          description: "Category for testing article sorting functionality",
          sort_order: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "member123!",
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      ip: "127.0.0.1",
      href: "https://test.example.com/member/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://test.example.com" satisfies string &
        tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create multiple articles
  const articles: IDiscussionBoardArticle[] = [];

  const articleData = [
    { title: "First Article - Old", bodyPrefix: "This is the oldest article" },
    {
      title: "Second Article - Medium Old",
      bodyPrefix: "This is a medium-old article",
    },
    { title: "Third Article - Recent", bodyPrefix: "This is a recent article" },
    {
      title: "Fourth Article - Medium",
      bodyPrefix: "This is a medium article",
    },
    {
      title: "Fifth Article - Newest",
      bodyPrefix: "This is the newest article",
    },
  ];

  for (const data of articleData) {
    const article = await api.functional.discussionBoard.member.articles.create(
      connection,
      {
        body: {
          title: data.title,
          body: `${data.bodyPrefix}. ${RandomGenerator.content({ paragraphs: 1, sentenceMin: 10, sentenceMax: 15 })}`,
          discussion_board_article_category_id: category.id,
          status: "published" as const,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
    typia.assert(article);
    articles.push(article);
  }

  // Step 5: Test sorting by published_at DESC (newest first)
  const sortByPublishedDesc =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        discussion_board_article_category_id: category.id,
        status: "published" as const,
        sort_by: "published_at" as const,
        sort_order: "desc" as const,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(sortByPublishedDesc);

  TestValidator.predicate(
    "published_at DESC returns articles",
    sortByPublishedDesc.data.length === 5,
  );

  // Verify descending order by published_at
  for (let i = 0; i < sortByPublishedDesc.data.length - 1; i++) {
    const currentPublished = sortByPublishedDesc.data[i].published_at;
    const nextPublished = sortByPublishedDesc.data[i + 1].published_at;
    typia.assertGuard(currentPublished!);
    typia.assertGuard(nextPublished!);

    const current = new Date(currentPublished).getTime();
    const next = new Date(nextPublished).getTime();
    TestValidator.predicate(
      `published_at DESC order check: article ${i} >= article ${i + 1}`,
      current >= next,
    );
  }

  // Step 6: Test sorting by view_count DESC (most popular first)
  const sortByViewCountDesc =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        discussion_board_article_category_id: category.id,
        status: "published" as const,
        sort_by: "view_count" as const,
        sort_order: "desc" as const,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(sortByViewCountDesc);

  TestValidator.predicate(
    "view_count DESC returns articles",
    sortByViewCountDesc.data.length === 5,
  );

  // Verify descending order by view_count
  for (let i = 0; i < sortByViewCountDesc.data.length - 1; i++) {
    const current = sortByViewCountDesc.data[i].view_count;
    const next = sortByViewCountDesc.data[i + 1].view_count;
    TestValidator.predicate(
      `view_count DESC order check: article ${i} (${current}) >= article ${i + 1} (${next})`,
      current >= next,
    );
  }

  // Step 7: Test sorting by updated_at DESC (recently modified first)
  const sortByUpdatedDesc = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        discussion_board_article_category_id: category.id,
        status: "published" as const,
        sort_by: "updated_at" as const,
        sort_order: "desc" as const,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(sortByUpdatedDesc);

  TestValidator.predicate(
    "updated_at DESC returns articles",
    sortByUpdatedDesc.data.length === 5,
  );

  // Verify descending order by updated_at
  for (let i = 0; i < sortByUpdatedDesc.data.length - 1; i++) {
    const current = new Date(sortByUpdatedDesc.data[i].updated_at).getTime();
    const next = new Date(sortByUpdatedDesc.data[i + 1].updated_at).getTime();
    TestValidator.predicate(
      `updated_at DESC order check: article ${i} >= article ${i + 1}`,
      current >= next,
    );
  }

  // Step 8: Test sorting by created_at ASC (oldest first)
  const sortByCreatedAsc = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        discussion_board_article_category_id: category.id,
        status: "published" as const,
        sort_by: "created_at" as const,
        sort_order: "asc" as const,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(sortByCreatedAsc);

  TestValidator.predicate(
    "created_at ASC returns articles",
    sortByCreatedAsc.data.length === 5,
  );

  // Verify ascending order by created_at
  for (let i = 0; i < sortByCreatedAsc.data.length - 1; i++) {
    const current = new Date(sortByCreatedAsc.data[i].created_at).getTime();
    const next = new Date(sortByCreatedAsc.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `created_at ASC order check: article ${i} <= article ${i + 1}`,
      current <= next,
    );
  }

  // Step 9: Test sorting by created_at DESC (newest first)
  const sortByCreatedDesc = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        discussion_board_article_category_id: category.id,
        status: "published" as const,
        sort_by: "created_at" as const,
        sort_order: "desc" as const,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(sortByCreatedDesc);

  TestValidator.predicate(
    "created_at DESC returns articles",
    sortByCreatedDesc.data.length === 5,
  );

  // Verify descending order by created_at
  for (let i = 0; i < sortByCreatedDesc.data.length - 1; i++) {
    const current = new Date(sortByCreatedDesc.data[i].created_at).getTime();
    const next = new Date(sortByCreatedDesc.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `created_at DESC order check: article ${i} >= article ${i + 1}`,
      current >= next,
    );
  }

  // Step 10: Verify that ASC and DESC produce reversed orderings
  TestValidator.predicate(
    "ASC and DESC orderings are reversed",
    sortByCreatedAsc.data[0].id ===
      sortByCreatedDesc.data[sortByCreatedDesc.data.length - 1].id,
  );
}
