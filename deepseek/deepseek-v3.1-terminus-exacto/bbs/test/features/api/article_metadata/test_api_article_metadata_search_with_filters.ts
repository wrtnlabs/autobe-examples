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

export async function test_api_article_metadata_search_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
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
  typia.assert(member);
  // 2. Create articles with diverse metadata for testing
  const articles: IDiscussionBoardArticle[] = [];
  // Create multiple articles with different characteristics
  for (let i = 0; i < 5; i++) {
    const article =
      await generate_random_discussion_board_member_articles_create(
        memberConnection,
        {
          body: {
            title: RandomGenerator.paragraph({ sentences: 1 }),
            body: RandomGenerator.content({
              paragraphs: randint(1, 5),
              sentenceMin: 3,
              sentenceMax: 10,
            }),
            discussion_board_section_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    typia.assert(article);
    articles.push(article);
  }
  // 3. Test various search filters
  // Test 1: Filter by featured status
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
  const nonFeaturedSearch =
    await api.functional.discussionBoard.member.articles.metadata.index(
      memberConnection,
      {
        body: {
          is_featured: false,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleMetadatum.IRequest,
      },
    );
  typia.assert(nonFeaturedSearch);
  // Test 2: Reading time range filters
  const readingTimeSearch =
    await api.functional.discussionBoard.member.articles.metadata.index(
      memberConnection,
      {
        body: {
          min_reading_time: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          max_reading_time: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleMetadatum.IRequest,
      },
    );
  typia.assert(readingTimeSearch);
  // Test 3: Text search on SEO metadata
  const textSearch =
    await api.functional.discussionBoard.member.articles.metadata.index(
      memberConnection,
      {
        body: {
          meta_title: RandomGenerator.substring(
            RandomGenerator.paragraph({ sentences: 1 }),
          ),
          meta_description: RandomGenerator.substring(
            RandomGenerator.paragraph({ sentences: 2 }),
          ),
          meta_keywords: RandomGenerator.substring(
            RandomGenerator.paragraph({ sentences: 1 }),
          ),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleMetadatum.IRequest,
      },
    );
  typia.assert(textSearch);
  // Test 4: Combined filters
  const combinedSearch =
    await api.functional.discussionBoard.member.articles.metadata.index(
      memberConnection,
      {
        body: {
          is_featured: true,
          min_reading_time: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          max_reading_time: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          meta_title: RandomGenerator.substring(
            RandomGenerator.paragraph({ sentences: 1 }),
          ),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleMetadatum.IRequest,
      },
    );
  typia.assert(combinedSearch);
  // 4. Validate response structure and pagination
  TestValidator.equals(
    "pagination structure exists",
    typeof featuredSearch.pagination,
    "object",
  );
  TestValidator.predicate(
    "pagination has current page",
    featuredSearch.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    featuredSearch.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has total records",
    featuredSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has total pages",
    featuredSearch.pagination.pages >= 0,
  );
  // Validate metadata summary structure
  if (featuredSearch.data.length > 0) {
    const metadata = featuredSearch.data[0];
    TestValidator.equals("metadata has id", typeof metadata.id, "string");
    TestValidator.equals(
      "metadata has metaTitle",
      typeof metadata.metaTitle,
      "string",
    );
    TestValidator.equals(
      "metadata has metaDescription",
      typeof metadata.metaDescription,
      "string",
    );
    TestValidator.equals(
      "metadata has metaKeywords",
      typeof metadata.metaKeywords,
      "string",
    );
    TestValidator.equals(
      "metadata has readingTimeMinutes",
      typeof metadata.readingTimeMinutes,
      "number",
    );
    TestValidator.equals(
      "metadata has isFeatured",
      typeof metadata.isFeatured,
      "boolean",
    );
    TestValidator.equals(
      "metadata has createdAt",
      typeof metadata.createdAt,
      "string",
    );
    TestValidator.equals(
      "metadata has article",
      typeof metadata.article,
      "object",
    );
    // Validate article summary structure
    TestValidator.equals(
      "article has id",
      typeof metadata.article.id,
      "string",
    );
    TestValidator.equals(
      "article has title",
      typeof metadata.article.title,
      "string",
    );
    TestValidator.equals(
      "article has author",
      typeof metadata.article.author,
      "object",
    );
    TestValidator.equals(
      "article has section",
      typeof metadata.article.section,
      "object",
    );
    TestValidator.equals(
      "article has tags",
      Array.isArray(metadata.article.tags),
      true,
    );
    TestValidator.equals(
      "article has comments_count",
      typeof metadata.article.comments_count,
      "number",
    );
    TestValidator.equals(
      "article has created_at",
      typeof metadata.article.created_at,
      "string",
    );
  }
}