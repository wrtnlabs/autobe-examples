import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
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

export async function test_api_popular_articles_filtered_by_section(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
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
  // First, get the list of available sections
  // Since sections are managed by admins, we need to use existing sections
  // For this test, we'll assume there are at least 2 sections available
  // Create articles in different sections to test filtering
  // We'll create articles and then filter by the sections they belong to
  // Create first article
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
  // Create second article in a different section
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
  // Ensure we have different sections for proper testing
  TestValidator.notEquals(
    "articles in different sections",
    article1.section.id,
    article2.section.id,
  );
  // Test filtering by section 1
  const section1Popular =
    await api.functional.discussionBoard.member.popular.index(
      memberConnection,
      {
        body: {
          discussion_board_section_id: article1.section.id,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(section1Popular);
  // Validate that articles from the specified section are returned
  TestValidator.predicate(
    "section 1 articles returned",
    section1Popular.data.length > 0,
  );
  for (const article of section1Popular.data) {
    TestValidator.equals(
      "article belongs to correct section",
      article.section.id,
      article1.section.id,
    );
  }
  // Test filtering by section 2
  const section2Popular =
    await api.functional.discussionBoard.member.popular.index(
      memberConnection,
      {
        body: {
          discussion_board_section_id: article2.section.id,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(section2Popular);
  // Validate that articles from the specified section are returned
  TestValidator.predicate(
    "section 2 articles returned",
    section2Popular.data.length > 0,
  );
  for (const article of section2Popular.data) {
    TestValidator.equals(
      "article belongs to correct section",
      article.section.id,
      article2.section.id,
    );
  }
  // Test that sections are properly isolated
  TestValidator.notEquals(
    "different sections return different articles",
    section1Popular.data[0]?.id,
    section2Popular.data[0]?.id,
  );
  // Test pagination information
  TestValidator.predicate(
    "section 1 pagination valid",
    section1Popular.pagination.records >= section1Popular.data.length,
  );
  TestValidator.predicate(
    "section 2 pagination valid",
    section2Popular.pagination.records >= section2Popular.data.length,
  );
  // Test that articles include proper section information
  for (const article of [...section1Popular.data, ...section2Popular.data]) {
    TestValidator.predicate(
      "article has section id",
      typeof article.section.id === "string" && article.section.id.length > 0,
    );
    TestValidator.predicate(
      "article has section name",
      typeof article.section.name === "string" &&
        article.section.name.length > 0,
    );
    TestValidator.predicate(
      "article has valid created_at",
      typeof article.created_at === "string" && article.created_at.length > 0,
    );
  }
}
