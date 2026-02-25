import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_articles_create } from "../../../generate/generate_random_discussion_board_admin_articles_create";
import { generate_random_discussion_board_admin_articles_tags_create } from "../../../generate/generate_random_discussion_board_admin_articles_tags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";

/**
 * Test enforcement of maximum 10 tags per article business rule.
 */
export async function test_api_article_tag_maximum_limit_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create article as admin
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const article = await api.functional.discussionBoard.admin.articles.create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: sectionId,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Add 10 unique tags successfully
  const tags = ArrayUtil.repeat(10, (index) => ({
    tag_name: `tag-${index + 1}-${RandomGenerator.alphabets(5)}`,
  }));
  for (const tagInfo of tags) {
    const tag = await api.functional.discussionBoard.admin.articles.tags.create(
      adminConnection,
      {
        articleId: article.id,
        body: {
          tag_name: tagInfo.tag_name,
        } satisfies IDiscussionBoardArticleTag.ICreate,
      },
    );
    typia.assert(tag);
    TestValidator.equals("tag name matches", tag.tag_name, tagInfo.tag_name);
  }
  // 4. Attempt to add 11th tag and verify error response
  await TestValidator.error("exceed maximum tag limit", async () => {
    await api.functional.discussionBoard.admin.articles.tags.create(
      adminConnection,
      {
        articleId: article.id,
        body: {
          tag_name: `excess-tag-${RandomGenerator.alphabets(5)}`,
        } satisfies IDiscussionBoardArticleTag.ICreate,
      },
    );
  });
  // 5. Validate owner enforcement by attempting to add tag with different connection
  const otherAdminConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("only article owner can add tags", async () => {
    await api.functional.discussionBoard.admin.articles.tags.create(
      otherAdminConnection,
      {
        articleId: article.id,
        body: {
          tag_name: `unauthorized-tag-${RandomGenerator.alphabets(5)}`,
        } satisfies IDiscussionBoardArticleTag.ICreate,
      },
    );
  });
}
