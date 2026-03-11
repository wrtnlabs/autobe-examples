import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleMetadatum";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_article_metadata_featured_status_editorial_workflow(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection using utility function
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
  // Create articles with varying content lengths using utility function
  const articles = await ArrayUtil.asyncRepeat(3, async (index) => {
    const contentLengths = [50, 500, 2000]; // Short, medium, long content
    const content = RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: Math.ceil(contentLengths[index] / 20),
      sentenceMax: Math.ceil(contentLengths[index] / 20) + 2,
      wordMin: 3,
      wordMax: 8,
    });
    const article =
      await generate_random_discussion_board_member_articles_create(
        memberConnection,
        {
          body: {
            title: RandomGenerator.paragraph({ sentences: 1 }),
            body: content,
            discussion_board_section_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    typia.assert(article);
    return article;
  });
  // Test metadata retrieval for each article
  for (const article of articles) {
    const metadata = await api.functional.discussionBoard.articles.metadata.at(
      memberConnection,
      {
        articleId: article.id,
      },
    );
    typia.assert(metadata);
    // Validate metadata structure - business logic only
    TestValidator.equals(
      "metadata belongs to correct article",
      metadata.id,
      article.id,
    );
    TestValidator.predicate(
      "featured status is consistent",
      typeof metadata.is_featured === "boolean",
    );
    TestValidator.predicate(
      "timestamps are valid",
      new Date(metadata.created_at) <= new Date(metadata.updated_at),
    );
    // Test reading time calculation business logic
    if (
      metadata.reading_time_minutes !== null &&
      metadata.reading_time_minutes !== undefined
    ) {
      TestValidator.predicate(
        "reading time is reasonable for content length",
        metadata.reading_time_minutes > 0 && metadata.reading_time_minutes < 60,
      );
    }
    // Test SEO fields handling - business logic validation
    TestValidator.predicate(
      "optional SEO fields are handled correctly",
      (metadata.meta_title === null ||
        metadata.meta_title === undefined ||
        typeof metadata.meta_title === "string") &&
        (metadata.meta_description === null ||
          metadata.meta_description === undefined ||
          typeof metadata.meta_description === "string") &&
        (metadata.meta_keywords === null ||
          metadata.meta_keywords === undefined ||
          typeof metadata.meta_keywords === "string"),
    );
  }
  // Test featured status consistency across multiple retrievals
  const firstArticleMetadata =
    await api.functional.discussionBoard.articles.metadata.at(
      memberConnection,
      {
        articleId: articles[0].id,
      },
    );
  typia.assert(firstArticleMetadata);
  const secondRetrieval =
    await api.functional.discussionBoard.articles.metadata.at(
      memberConnection,
      {
        articleId: articles[0].id,
      },
    );
  typia.assert(secondRetrieval);
  TestValidator.equals(
    "featured status remains consistent",
    firstArticleMetadata.is_featured,
    secondRetrieval.is_featured,
  );
}
