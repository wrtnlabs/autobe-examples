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
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearch";
import type { IDiscussionBoardSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchResult";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSearchResult";

/**
 * End-to-end test: Global full-text search filtered by category and tag.
 *
 * Business purpose:
 *
 * - Ensure that the global search endpoint returns published articles that match
 *   a full-text query and respect category/tag filters.
 * - Validate pagination metadata and behavior when no matches exist.
 *
 * Workflow:
 *
 * 1. Register a moderator and create a category and tag (taxonomy setup).
 * 2. Register a member and create a published article containing a unique keyword;
 *    assign the created category (by slug) and tag (by slug).
 * 3. Create a comment and an attachment for the article; these include unique
 *    keywords (for realistic coverage), but primary verification focuses on
 *    article-level search results because the available response DTOs are
 *    article summaries.
 * 4. Call PATCH /discussionBoard/search/global with a query that targets the
 *    article's unique keyword and filters (categoryId + tagSlugs). Validate
 *    that the created article appears in results and that returned summaries
 *    include expected fields and relationships (category, tags).
 * 5. Call search with a non-existent random token and verify empty result set and
 *    correct pagination metadata.
 */
export async function test_api_search_global_fulltext_by_category_and_tag(
  connection: api.IConnection,
) {
  // 1. Moderator: join and create taxonomy (category + tag)
  const moderatorPassword = "Moderator!23456";
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: `mod_${RandomGenerator.alphaNumeric(6)}`,
        email: typia.random<string & tags.Format<"email">>(),
        password: moderatorPassword,
        href: "https://example.com/moderator",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Create category
  const categorySlug = `cat-${RandomGenerator.alphaNumeric(6)}`;
  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: categorySlug,
          description: RandomGenerator.paragraph({ sentences: 6 }),
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Create tag
  const tagSlug = `tag-${RandomGenerator.alphaNumeric(6)}`;
  const tag: IDiscussionBoardTag =
    await api.functional.discussionBoard.moderator.tags.create(connection, {
      body: {
        name: RandomGenerator.name(2),
        slug: tagSlug,
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(tag);

  // 2. Member: join and create a published article referencing category + tag
  const memberPassword = "Member!23456789";
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: `user_${RandomGenerator.alphaNumeric(6)}`,
        email: typia.random<string & tags.Format<"email">>(),
        password: memberPassword,
        href: "https://example.com/member",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member);

  // Unique token for searchability
  const articleToken = RandomGenerator.alphaNumeric(8);
  const articleTitle = `E2E Search Article ${articleToken}`;
  const articleContent = `${RandomGenerator.content({ paragraphs: 2 })}\n\nSearchToken:${articleToken}`;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: articleTitle,
        content: articleContent,
        category_slug: category.slug,
        tag_slugs: [tag.slug],
        state: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // 3. Create a comment that contains its own token (helps multi-entity coverage)
  const commentToken = RandomGenerator.alphaNumeric(8);
  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: `Comment content referencing ${commentToken}`,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // 4. Upload an attachment whose original_filename contains the article token
  const attachmentFilename = `attach_${articleToken}_${RandomGenerator.alphaNumeric(
    6,
  )}.png`;
  const storageKey = `https://storage.example.com/${RandomGenerator.alphaNumeric(12)}`;
  const attachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          original_filename: attachmentFilename,
          storage_key: storageKey,
          mime_type: "image/png",
          size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<0> &
              tags.Maximum<5242880>
          >(),
          is_image: true,
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 5. Search: full-text query matching the article token, filter by category id and tag slug
  const searchRequest: IDiscussionBoardSearch.IRequest = {
    query: articleToken,
    filters: {
      types: ["article", "comment", "attachment", "tag"],
      categoryId: category.id,
      tagSlugs: [tag.slug],
    },
    page: 1,
    limit: 20,
    sort: "relevance",
    highlight: true,
  } satisfies IDiscussionBoardSearch.IRequest;

  const searchResult: IPageIDiscussionBoardSearchResult.ISummary =
    await api.functional.discussionBoard.search.global.search(connection, {
      body: searchRequest,
    });
  typia.assert(searchResult);

  // Validate pagination metadata exists
  TestValidator.predicate(
    "pagination exists",
    searchResult.pagination !== null && searchResult.pagination !== undefined,
  );

  // Validate that at least one returned summary matches the created article id
  TestValidator.predicate(
    "created article appears in search results",
    searchResult.data.some((d) => d.id === article.id),
  );

  // Find the article summary and validate fields
  const found = searchResult.data.find((d) => d.id === article.id);
  typia.assert(found!);
  const articleSummary = found!;

  TestValidator.equals("article id matches", articleSummary.id, article.id);
  TestValidator.equals(
    "article title matches",
    articleSummary.title,
    article.title,
  );

  // Category association check (actual-first, expected-second)
  TestValidator.equals(
    "article category matches",
    articleSummary.category?.id ?? null,
    category.id,
  );

  // Tag association: ensure at least one tag with matching slug exists on the summary
  TestValidator.predicate(
    "article includes created tag",
    (articleSummary.tags ?? []).some((t) => t.slug === tag.slug),
  );

  // 6. Combined filters behavior: search again and assert every returned
  // article (if any) belongs to the requested category and references the tag
  const combinedResult: IPageIDiscussionBoardSearchResult.ISummary =
    await api.functional.discussionBoard.search.global.search(connection, {
      body: {
        query: articleToken,
        filters: {
          types: ["article"],
          categoryId: category.id,
          tagSlugs: [tag.slug],
        },
        page: 1,
        limit: 50,
        highlight: false,
      } satisfies IDiscussionBoardSearch.IRequest,
    });
  typia.assert(combinedResult);

  // All returned items (if any) must have the category and tag
  TestValidator.predicate(
    "combined filters restrict results to category and tag",
    combinedResult.data.every(
      (d) =>
        d.category?.id === category.id &&
        (d.tags ?? []).some((t) => t.slug === tag.slug),
    ),
  );

  // 7. Edge-case: search for a random nonexistent token -> expect empty results
  const randomToken = `noexist_${RandomGenerator.alphaNumeric(12)}`;
  const emptySearch: IPageIDiscussionBoardSearchResult.ISummary =
    await api.functional.discussionBoard.search.global.search(connection, {
      body: {
        query: randomToken,
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardSearch.IRequest,
    });
  typia.assert(emptySearch);

  TestValidator.equals(
    "empty search returns zero data",
    emptySearch.data.length,
    0,
  );
  TestValidator.predicate(
    "empty search pagination is valid",
    emptySearch.pagination !== null && emptySearch.pagination !== undefined,
  );
}
