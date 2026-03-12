import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_article_tag_assignment_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the primary success path where a member assigns multiple new free-text tags to their own article.
   *
   * Setup:
   * 1. Administrator creates a section
   * 2. Member registers and authenticates
   * 3. Member creates an article in the section without tags
   *
   * Test Execution:
   * 1. Member sends POST request to assign tags to their article
   * 2. Verify response contains IDiscussionBoardArticleTag object
   * 3. Verify tag assignment includes proper structure
   * 4. Verify tags preserve exact input names
   */
  // 1. Administrator setup - create section
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: "Technology",
          description: "Technology related articles",
        },
      },
    );
  typia.assert(section);
  // 2. Member setup - register and create article
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: "Introduction to Web Development",
        content: RandomGenerator.paragraph({ sentences: 5 }),
        section_id: section.id,
      },
    },
  );
  typia.assert(article);
  // 3. Assign tags to the article
  const tagNames = ["javascript", "web-development", "tutorial"];
  const articleTag =
    await generate_random_discussion_board_member_articles_tags_create(
      memberConnection,
      {
        params: {
          articleId: article.id,
        },
        body: {
          tagNames: tagNames,
        },
      },
    );
  typia.assert(articleTag);
  // 4. Validate response structure
  TestValidator.equals(
    "response has article reference",
    articleTag.article.id,
    article.id,
  );
  TestValidator.predicate(
    "tag name matches input",
    articleTag.tag.name === tagNames[0],
  );
  TestValidator.predicate(
    "has valid id",
    /^[0-9a-f-]{36}$/i.test(articleTag.id),
  );
  TestValidator.predicate(
    "has valid created_at",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      articleTag.created_at,
    ),
  );
  // 5. Verify article-tag junction was created
  TestValidator.equals("article id matches", articleTag.article.id, article.id);
  TestValidator.equals(
    "article title matches",
    articleTag.article.title,
    article.title,
  );
  // 6. Verify tag was created with exact input (case-sensitive)
  TestValidator.equals(
    "tag preserves exact name",
    articleTag.tag.name,
    "javascript",
  );
  TestValidator.predicate(
    "tag has valid id",
    /^[0-9a-f-]{36}$/i.test(articleTag.tag.id),
  );
  TestValidator.predicate(
    "tag has valid created_at",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      articleTag.tag.created_at,
    ),
  );
  // 7. Verify the tag assignment timestamp
  TestValidator.predicate(
    "assignment has valid timestamp",
    articleTag.created_at.length > 0,
  );
}