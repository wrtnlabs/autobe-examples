import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleMetadatum";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleMetadatum";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_metadata_search_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // Create baseline articles with known metadata
  // Note: Section IDs are generated randomly - in a real scenario these would need to exist
  const article1 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.content({ paragraphs: 3 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article1);
  const article2 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.content({ paragraphs: 3 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article2);
  // Test 1: Search for featured articles when none are featured
  const featuredSearch =
    await api.functional.discussionBoard.member.articles.metadata.index(
      memberConnection,
      {
        body: {
          is_featured: true,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleMetadatum.IRequest,
      },
    );
  typia.assert(featuredSearch);
  TestValidator.equals(
    "featured search has no results",
    featuredSearch.data.length,
    0,
  );
  TestValidator.equals(
    "featured search records count",
    featuredSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "featured search pages count",
    featuredSearch.pagination.pages,
    0,
  );
  // Test 2: Reading time range filters outside actual values
  const readingTimeSearch =
    await api.functional.discussionBoard.member.articles.metadata.index(
      memberConnection,
      {
        body: {
          min_reading_time: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1000>
          >(),
          max_reading_time: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<2000>
          >(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleMetadatum.IRequest,
      },
    );
  typia.assert(readingTimeSearch);
  TestValidator.equals(
    "reading time search has no results",
    readingTimeSearch.data.length,
    0,
  );
  TestValidator.equals(
    "reading time search records count",
    readingTimeSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "reading time search pages count",
    readingTimeSearch.pagination.pages,
    0,
  );
  // Test 3: Search for non-existent meta_title
  const metaTitleSearch =
    await api.functional.discussionBoard.member.articles.metadata.index(
      memberConnection,
      {
        body: {
          meta_title: RandomGenerator.paragraph({ sentences: 1 }),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleMetadatum.IRequest,
      },
    );
  typia.assert(metaTitleSearch);
  TestValidator.equals(
    "meta title search has no results",
    metaTitleSearch.data.length,
    0,
  );
  TestValidator.equals(
    "meta title search records count",
    metaTitleSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "meta title search pages count",
    metaTitleSearch.pagination.pages,
    0,
  );
  // Test 4: Search for non-existent meta_description
  const metaDescriptionSearch =
    await api.functional.discussionBoard.member.articles.metadata.index(
      memberConnection,
      {
        body: {
          meta_description: RandomGenerator.paragraph({ sentences: 1 }),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleMetadatum.IRequest,
      },
    );
  typia.assert(metaDescriptionSearch);
  TestValidator.equals(
    "meta description search has no results",
    metaDescriptionSearch.data.length,
    0,
  );
  TestValidator.equals(
    "meta description search records count",
    metaDescriptionSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "meta description search pages count",
    metaDescriptionSearch.pagination.pages,
    0,
  );
  // Test 5: Search for non-existent meta_keywords
  const metaKeywordsSearch =
    await api.functional.discussionBoard.member.articles.metadata.index(
      memberConnection,
      {
        body: {
          meta_keywords: RandomGenerator.paragraph({ sentences: 1 }),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleMetadatum.IRequest,
      },
    );
  typia.assert(metaKeywordsSearch);
  TestValidator.equals(
    "meta keywords search has no results",
    metaKeywordsSearch.data.length,
    0,
  );
  TestValidator.equals(
    "meta keywords search records count",
    metaKeywordsSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "meta keywords search pages count",
    metaKeywordsSearch.pagination.pages,
    0,
  );
  // Test 6: Combine multiple restrictive filters
  const combinedSearch =
    await api.functional.discussionBoard.member.articles.metadata.index(
      memberConnection,
      {
        body: {
          is_featured: true,
          min_reading_time: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1000>
          >(),
          meta_title: RandomGenerator.paragraph({ sentences: 1 }),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleMetadatum.IRequest,
      },
    );
  typia.assert(combinedSearch);
  TestValidator.equals(
    "combined search has no results",
    combinedSearch.data.length,
    0,
  );
  TestValidator.equals(
    "combined search records count",
    combinedSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "combined search pages count",
    combinedSearch.pagination.pages,
    0,
  );
  // Test 7: Edge case - reading time less than zero
  const negativeReadingTimeSearch =
    await api.functional.discussionBoard.member.articles.metadata.index(
      memberConnection,
      {
        body: {
          max_reading_time: 0,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleMetadatum.IRequest,
      },
    );
  typia.assert(negativeReadingTimeSearch);
  TestValidator.equals(
    "negative reading time search has no results",
    negativeReadingTimeSearch.data.length,
    0,
  );
  TestValidator.equals(
    "negative reading time search records count",
    negativeReadingTimeSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "negative reading time search pages count",
    negativeReadingTimeSearch.pagination.pages,
    0,
  );
  // Test 8: Impossible reading time range (min > max)
  const impossibleRangeSearch =
    await api.functional.discussionBoard.member.articles.metadata.index(
      memberConnection,
      {
        body: {
          min_reading_time: 100,
          max_reading_time: 50,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleMetadatum.IRequest,
      },
    );
  typia.assert(impossibleRangeSearch);
  TestValidator.equals(
    "impossible range search has no results",
    impossibleRangeSearch.data.length,
    0,
  );
  TestValidator.equals(
    "impossible range search records count",
    impossibleRangeSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "impossible range search pages count",
    impossibleRangeSearch.pagination.pages,
    0,
  );
}
