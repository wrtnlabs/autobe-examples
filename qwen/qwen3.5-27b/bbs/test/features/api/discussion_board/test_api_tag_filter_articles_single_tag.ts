import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_administrator_sections_create } from "../../../generate/generate_random_discussion_board_administrator_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { generate_random_discussion_board_member_articles_tags_create } from "../../../generate/generate_random_discussion_board_member_articles_tags_create";
import { generate_random_discussion_board_member_tags_create } from "../../../generate/generate_random_discussion_board_member_tags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_tag } from "../../../prepare/prepare_random_discussion_board_tag";

/**
 * Test filtering articles by a single tag with pagination.
 *
 * This test verifies that the tag-based article filtering endpoint correctly
 * returns only articles that have the specified tag, with proper pagination
 * metadata and article summary information.
 */
export async function test_api_tag_filter_articles_single_tag(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create member account for test data
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  // 2. Setup: Create administrator account for section creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  // 3. Setup: Create a section for articles
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: "Technology Section",
          description: "Articles about technology and innovation",
        },
      },
    );
  typia.assert(section);
  // 4. Setup: Create two tags - 'technology' and 'news'
  const technologyTag =
    await generate_random_discussion_board_member_tags_create(
      memberConnection,
      {
        body: {
          name: "technology",
        },
      },
    );
  typia.assert(technologyTag);
  const newsTag = await generate_random_discussion_board_member_tags_create(
    memberConnection,
    {
      body: {
        name: "news",
      },
    },
  );
  typia.assert(newsTag);
  // 5. Setup: Create 3 articles - 2 with 'technology' tag, 1 without
  const articleWithTechTag1 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: "First Technology Article",
          content: RandomGenerator.paragraph({ sentences: 5 }),
          section_id: section.id,
          tags: ["technology"],
        },
      },
    );
  typia.assert(articleWithTechTag1);
  const articleWithTechTag2 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: "Second Technology Article",
          content: RandomGenerator.paragraph({ sentences: 5 }),
          section_id: section.id,
          tags: ["technology"],
        },
      },
    );
  typia.assert(articleWithTechTag2);
  const articleWithoutTag =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: "Article Without Technology Tag",
          content: RandomGenerator.paragraph({ sentences: 5 }),
          section_id: section.id,
          tags: ["news"],
        },
      },
    );
  typia.assert(articleWithoutTag);
  // 6. Test: Filter articles by 'technology' tag
  const filteredResult =
    await api.functional.discussionBoard.tags.articles.patch(connection, {
      body: {
        tag_ids: [technologyTag.id],
        page: 1,
        limit: 10,
      },
    });
  typia.assert(filteredResult);
  // 7. Validate: Response contains only articles with 'technology' tag
  TestValidator.equals(
    "filtered articles count",
    filteredResult.data.length,
    2,
  );
  // 8. Validate: Both technology-tagged articles are present
  const returnedIds = filteredResult.data.map((a) => a.id);
  TestValidator.predicate(
    "first technology article included",
    returnedIds.includes(articleWithTechTag1.id),
  );
  TestValidator.predicate(
    "second technology article included",
    returnedIds.includes(articleWithTechTag2.id),
  );
  // 9. Validate: Article without technology tag is NOT included
  TestValidator.predicate(
    "article without tag excluded",
    !returnedIds.includes(articleWithoutTag.id),
  );
  // 10. Validate: Pagination metadata is correct
  TestValidator.equals("current page", filteredResult.pagination.current, 1);
  TestValidator.equals("limit", filteredResult.pagination.limit, 10);
  TestValidator.equals("total records", filteredResult.pagination.records, 2);
  TestValidator.equals("total pages", filteredResult.pagination.pages, 1);
  // 11. Validate: Each article summary includes required fields
  for (const article of filteredResult.data) {
    // Verify id is present and valid UUID
    TestValidator.predicate(
      `article has valid id: ${article.id}`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        article.id,
      ),
    );
    // Verify title is present
    TestValidator.predicate(
      `article has title: ${article.id}`,
      article.title.length > 0,
    );
    // Verify section info is present
    TestValidator.predicate(
      `article has section: ${article.id}`,
      article.section.id !== undefined,
    );
    TestValidator.predicate(
      `article section has name: ${article.id}`,
      article.section.name.length > 0,
    );
    // Verify author info is present
    TestValidator.predicate(
      `article has author: ${article.id}`,
      article.author.id !== undefined,
    );
    TestValidator.predicate(
      `article author has email: ${article.id}`,
      article.author.email.length > 0,
    );
    // Verify timestamps are present
    TestValidator.predicate(
      `article has created_at: ${article.id}`,
      article.created_at.length > 0,
    );
    TestValidator.predicate(
      `article has updated_at: ${article.id}`,
      article.updated_at.length > 0,
    );
    // Verify deleted_at is null (soft-deleted articles excluded)
    TestValidator.equals(
      `article deleted_at is null: ${article.id}`,
      article.deleted_at,
      null,
    );
  }
  // 12. Validate: Sorting is by created_at DESC (default behavior)
  if (filteredResult.data.length >= 2) {
    const firstArticle = filteredResult.data[0];
    const secondArticle = filteredResult.data[1];
    TestValidator.predicate(
      "articles sorted by created_at DESC",
      new Date(firstArticle.created_at).getTime() >=
        new Date(secondArticle.created_at).getTime(),
    );
  }
}
