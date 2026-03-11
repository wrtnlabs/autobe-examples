import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { generate_random_discussion_board_member_articles_tags_create } from "../../../generate/generate_random_discussion_board_member_articles_tags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_admin_discovery_complex_moderation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create test sections
  const section1 = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: "Politics",
        description: "Political discussions and news",
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section1);
  const section2 = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: "Economy",
        description: "Economic discussions and analysis",
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section2);
  // 3. Member authentication
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
  // 4. Create articles with different characteristics
  const article1 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: "Economic Recovery Analysis",
          body: RandomGenerator.content({ paragraphs: 2 }),
          discussion_board_section_id: section2.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article1);
  // Add comment to article1
  const comment1 =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        params: { articleId: article1.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment1);
  const article2 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: "Political Debate on Current Affairs",
          body: RandomGenerator.content({ paragraphs: 3 }),
          discussion_board_section_id: section1.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article2);
  // Add multiple comments to article2
  const comment2 =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        params: { articleId: article2.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment2);
  const comment3 =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        params: { articleId: article2.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment3);
  // 5. Perform complex search operations
  // Test keyword search
  const searchResults1 =
    await api.functional.discussionBoard.admin.discovery.index(
      adminConnection,
      {
        body: {
          search: "Economic",
          discussion_board_section_id: section2.id,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(searchResults1);
  // Validate search results
  TestValidator.equals(
    "search results should contain article1",
    searchResults1.data.length,
    1,
  );
  TestValidator.equals(
    "article1 should match search criteria",
    searchResults1.data[0].id,
    article1.id,
  );
  TestValidator.equals(
    "article1 should have correct comment count",
    searchResults1.data[0].comments_count,
    1,
  );
  // Test section filtering
  const searchResults2 =
    await api.functional.discussionBoard.admin.discovery.index(
      adminConnection,
      {
        body: {
          discussion_board_section_id: section1.id,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(searchResults2);
  TestValidator.equals(
    "section filter should return correct articles",
    searchResults2.data.length,
    1,
  );
  TestValidator.equals(
    "section filter should match article2",
    searchResults2.data[0].id,
    article2.id,
  );
  TestValidator.equals(
    "article2 should have correct comment count",
    searchResults2.data[0].comments_count,
    2,
  );
  // Test pagination
  const searchResults3 =
    await api.functional.discussionBoard.admin.discovery.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(searchResults3);
  TestValidator.equals(
    "pagination should respect limit",
    searchResults3.data.length,
    1,
  );
  TestValidator.predicate(
    "pagination metadata should be correct",
    searchResults3.pagination.current === 1 &&
      searchResults3.pagination.limit === 1 &&
      searchResults3.pagination.records >= 2,
  );
  // Test empty search
  const searchResults4 =
    await api.functional.discussionBoard.admin.discovery.index(
      adminConnection,
      {
        body: {
          search: "NonexistentKeyword",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(searchResults4);
  TestValidator.equals(
    "nonexistent keyword should return empty results",
    searchResults4.data.length,
    0,
  );
  // Test combined search with multiple criteria
  const searchResults5 =
    await api.functional.discussionBoard.admin.discovery.index(
      adminConnection,
      {
        body: {
          search: "Debate",
          discussion_board_section_id: section1.id,
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(searchResults5);
  TestValidator.equals(
    "combined search should return matching article",
    searchResults5.data.length,
    1,
  );
  TestValidator.equals(
    "combined search should match article2",
    searchResults5.data[0].id,
    article2.id,
  );
}
